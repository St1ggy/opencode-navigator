# План v0.9.0: Todo, Subagents и лимиты списков

## Задача

Добавить в Todo переключатель `All / Active / Finished`, группировку активных, выполненных и отменённых задач. В Subagents показывать наблюдаемое время текущего запуска, ошибки и последние 10 завершённых запусков на родительскую сессию; историю хранить в памяти до завершения процесса OpenCode.

Для каждой из шести секций добавить настройку количества отображаемых элементов. По умолчанию показывать все элементы. При заданном лимите использовать `Show all` и `Show less`; применять ограничение после фильтрации и сортировки. Сохранять настройки лимитов в существующем global/worktree preferences, поддержать мышь и клавиатуру, обновить документацию и проверки.

## Структура плана

Выполнять этапы последовательно: настройки лимитов → общий механизм ограничения и навигации → подключение секций → Todo → модель наблюдаемых запусков Subagents → интерфейс Subagents → финальная проверка. После каждого этапа реализации выполнять отдельный этап поведенческих тестов. При начале реализации создать `vibe/sidebar-v0.9.0-plan-track.md` с отметками `[ ]` / `[X]` для этапов 1–13.

## План выполнения

### Этап 1: Настройки количества элементов

**Что добавить/реализовать:**

- Добавить `SectionItemLimits = Partial<Record<SidebarSection, number>>` и `PluginSettings.sectionItemLimits`. Значение `0` означает `All`; разрешить неотрицательные safe integers. Отбрасывать неизвестные секции, дроби, отрицательные числа, строки, `NaN` и `Infinity` при разборе документа.
- Добавить `parseSectionItemLimits()` и опцию плагина `section_item_limits`. Для отсутствующих значений использовать `0` во всех секциях: Todo, Subagents, Skills, Quick Actions, LSP, MCP.
- При разборе scoped overrides сохранять только явно заданные секции. В `resolvePreferences()` и `applyPreferencesUpdate()` объединять `sectionItemLimits` по отдельным ключам секций, учитывая `clearBehavior`; не заменять всю карту при изменении одной секции.
- В `createPreferencesController()` добавить `sectionItemLimit(section)`, `selectedSectionItemLimit(section)` и `setSectionItemLimit(section, value)`. Сохранять изменение сразу в `selectedTarget()` посредством delta update одной секции. Включить лимиты в сброс behavior.
- В Settings объединить лимиты с вкладкой `Sections`: добавить к каждой строке секции поле `Items: All/число`. По клику на поле или `L` открывать `DialogPrompt`: целое число, `0` для всех; Enter сохраняет переключение видимости. Ошибочный ввод показывать toast и сохранять введённый текст; после подтверждения или отмены возвращаться к исходной строке вкладки.
- Оставить лимиты настройками behavior; `Show all` не записывает preferences. Обновить существующие typed fixtures для нового поля `PluginSettings`.

**Файлы для изменения:**

- `src/preferences-schema.ts` — типы, парсинг, поэлементное разрешение лимитов.
- `src/config.ts` — чтение `section_item_limits`.
- `src/preferences-store.ts` — delta merge карты лимитов.
- `src/controllers/preferences.ts` — defaults, getters и setter.
- `src/dialogs/settings.tsx` — поле Items во вкладке Sections, prompt, контекстная подсказка и восстановление выбранной строки.
- `test/config.test.ts`, `test/preferences-schema.test.ts`, `test/preferences-controller.test.ts` — актуализировать существующие обязательные поля фикстур.

**Документация:**

- [Публичный TUI plugin API](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/specs/tui-plugins.md) — `ui.DialogPrompt`, dialog stack.
- `node_modules/@opencode-ai/plugin/dist/tui.d.ts` — использовать определения установленной версии `1.18.30` при проверке API.

**Примеры в проекте:** `setFocusKey()`, `selectedResolved()` и `resetPluginSettings()` в `src/controllers/preferences.ts`; `openPresetPrompt()` и обработка `focus_key` в `src/dialogs/settings.tsx`.

**Команды проверки:** `bun run typecheck`; `bun run lint`.

### Этап 2: Тесты настроек лимитов

**Что добавить/реализовать:**

- Проверить default `All`, валидные числа, неизвестные ключи, невалидный ввод и сохранение явного `0` поверх положительного inherited limit.
- Проверить precedence configured → global → worktree, независимое изменение двух секций, сброс behavior, перезапуск контроллера и изменение до hydration.
- Проверить concurrent updates независимых store instances: лимиты разных секций сохраняются одновременно с MCP-пресетами и favorites.
- Добавить renderer-тест объединённой вкладки `Sections`: переходы Tab/Shift+Tab, клавиша L и клик по Items, ввод значения, отмена и восстановление активной строки. Проверить независимость от переключения видимости и сохранение порядка вкладок.

**Файлы для изменения:** `test/config.test.ts`, `test/preferences-schema.test.ts`, `test/preferences-store.test.ts`, `test/preferences-controller.test.ts`, `test/section-interaction.test.tsx`.

**Примеры в проекте:** тест concurrent MCP preset saves в `test/preferences-store.test.ts`; тест сохранения настроек в `test/section-interaction.test.tsx`.

**Команды проверки:** `bun run build`; `bun test --preload @opentui/solid/preload test/config.test.ts test/preferences-schema.test.ts test/preferences-store.test.ts test/preferences-controller.test.ts test/section-interaction.test.tsx`; `bun run typecheck`.

### Этап 3: Общий лимит списка и порядок навигации

**Что добавить/реализовать:**

- Создать `createListVisibility()` с accessor-параметрами `items`, `limit`, `resetKey` и результатом `visible`, `hiddenCount`, `expanded`, `canToggle`, `showAll`, `showLess`.
- При `limit === 0` возвращать весь список без кнопок. При положительном лимите возвращать первые N элементов; `Show all` раскрывает весь текущий список одним действием, `Show less` возвращает N.
- Сбрасывать временное раскрытие при изменении target, поискового запроса, Todo-фильтра или лимита. Обычные обновления данных, таймера и favorites не сбрасывают раскрытие. Если список стал не длиннее лимита, скрывать кнопку и сбрасывать раскрытие.
- Создать `ListVisibilityControl` на `useSidebarItem()`: один стабильный navigation ID на секцию, `Show all (N more)` или `Show less`. При сворачивании сохранять фокус на этой кнопке; если она исчезла, переводить его на заголовок секции.
- Добавить `SidebarOrder = number | readonly [section: number, item: number]`. Расширить descriptor и accessor order, нормализовать старые числовые значения в `[number, 0]`, сортировать лексикографически.
- Для строк секций использовать `[baseOrder, 10 + index * 2]`, для star/retry — следующий дробный item index, для footer control — после последней видимой строки. Заголовок использовать как `[baseOrder, 0]`, header action и остальные контролы расположить перед строками. Сохранить динамическое вычисление baseOrder при перестановке секций.

**Файлы для создания/изменения:**

- `src/controllers/list-visibility.ts` — `createListVisibility()`.
- `src/components/list-visibility.tsx` — `ListVisibilityControl`.
- `src/sidebar-interaction.ts` — `SidebarOrder`, сравнение order.
- `src/components/common.tsx` — типы order для filter/header action.
- `src/components/sections.tsx` — типы order строк и request-контролов; перевод всех интерактивных элементов секций на составной порядок.

**Документация:** [Solid effects](https://docs.solidjs.com/concepts/effects), [onCleanup](https://docs.solidjs.com/reference/lifecycle/on-cleanup).

**Примеры в проекте:** `useSidebarItem()` в `src/components/common.tsx`; `available()` и `select()` в `src/sidebar-interaction.ts`; `SkillRow` и `McpRow` в `src/components/sections.tsx`.

**Команды проверки:** `bun run typecheck`; `bun run lint`.

### Этап 4: Тесты ограничения и навигации

**Что добавить/реализовать:**

- Создать тесты `createListVisibility()` для пустого списка, `0`, N, точного порога N, `Show all`, `Show less`, смены target/query/limit и обновления данных без потери раскрытия.
- Проверить навигацию по 500 элементам одной секции и переход к следующей: строки разных секций не перемешиваются, star/retry идут сразу после основной строки, перестановка секций меняет порядок.
- Проверить Enter и mouse release на footer control, сохранение фокуса при `Show less`, исчезновение footer и удаление скрытых строк из navigation registry.

**Файлы для создания/изменения:** `test/list-visibility.test.ts`, `test/sidebar-interaction.test.ts`, `test/sidebar-keyboard.test.tsx`, `test/section-interaction.test.tsx`.

**Примеры в проекте:** тест dynamic row order в `test/sidebar-interaction.test.ts`; harness реального клавиатурного ввода в `test/sidebar-keyboard.test.tsx`.

**Команды проверки:** `bun run build`; `bun test --preload @opentui/solid/preload test/list-visibility.test.ts test/sidebar-interaction.test.ts test/sidebar-keyboard.test.tsx test/section-interaction.test.tsx`; `bun run typecheck`.

### Этап 5: Ограничение во всех секциях

**Что добавить/реализовать:**

- Подключить `createListVisibility()` и `ListVisibilityControl` в Todo, Subagents, Skills, MCP, Quick Actions и LSP. Считать элементы данных, а не строки терминала: перенесённый текст и подробности ошибки входят в один элемент, LSP badge — один элемент.
- Использовать в качестве target key для Todo/Subagents sessionID + directory + workspace, для Skills/MCP `controller.target().key`, для LSP/Quick Actions — `currentLocation(api).key`. Экспортировать существующий `target()` Todo/Subagents через возвращаемый controller API.
- В Skills применять limit после favorites-first сортировки и текстового фильтра; пустой разделитель рисовать только между реально видимыми группами.
- В MCP применять limit после фильтра. Сохранить summary, preset matching, `Connect all`, `Disconnect all`, preset apply и bulk retry по полному списку серверов.
- Сохранить общие счётчики секций по полным данным. Пустой фильтр и пустая секция получают разные сообщения. Контролы, ошибки загрузки, заголовки групп и footer не входят в лимит.
- Для LSP оставить badges с `flexWrap`; footer разместить отдельной строкой после контейнера badges.

**Файлы для изменения:** `src/components/sections.tsx`, `src/controllers/todo.ts`, `src/controllers/subagents.ts`; обновить используемые test doubles новых public accessors в renderer-тестах.

**Примеры в проекте:** `SkillsSection.filtered()`, `McpSection.filtered()`, `LspSection` и `SectionRequestBody` в `src/components/sections.tsx`; `src/location.ts`.

**Команды проверки:** `bun run typecheck`; `bun run lint`; `bun run build`.

### Этап 6: Тесты секций с лимитами

**Что добавить/реализовать:**

- Проверить default `All` для всех шести секций, положительный limit и обе кнопки, очистку/изменение фильтра и смену текущей сессии.
- Проверить Skills favorites separator после ограничения; MCP bulk actions должны затрагивать серверы за пределами видимого списка и фильтра.
- Дополнить performance-тесты: 500 элементов при `All`, 500 входных элементов с limit 5, раскрытие полного списка и обратное сворачивание; проверять число смонтированных строк и navigation descriptors.
- Сохранить существующий бюджет каждого performance-теста `MAX_RENDER_MS = 10_000`.

**Файлы для изменения:** `test/section-interaction.test.tsx`, `test/section-performance.test.tsx`, `test/sidebar-keyboard.test.tsx`, `test/plugin-smoke.test.tsx`.

**Примеры в проекте:** `expectLargeList()` в `test/section-performance.test.tsx`; тесты фильтров и favorite toggle в `test/section-interaction.test.tsx`.

**Команды проверки:** `bun run build`; `bun test --preload @opentui/solid/preload test/section-interaction.test.tsx test/section-performance.test.tsx test/sidebar-keyboard.test.tsx test/plugin-smoke.test.tsx`; `bun run typecheck`.

### Этап 7: Фильтрация и группировка Todo

**Что добавить/реализовать:**

- Создать `TodoViewMode = "all" | "active" | "finished"` и `buildTodoView(todos, mode)` с группами и счётчиками.
- `All`: группы `Active`, `Completed`, `Cancelled`, затем `Other` для неизвестных будущих статусов. `Active`: `pending` и `in_progress`. `Finished`: `completed` и `cancelled` двумя отдельными группами.
- В Active выводить `in_progress` перед `pending`, внутри каждого статуса сохранять исходный порядок; в остальных группах также сохранять исходный порядок. Не объединять одинаковые по тексту задачи.
- Добавить ряд переключателей `All / Active / Finished` со счётчиками; режим по умолчанию `All`, состояние локальное для текущего target, при смене target сбрасывается.
- Для вывода сначала фильтровать и группировать, затем применять общий лимит к плоскому списку задач, затем рисовать заголовки непустых видимых групп. Между группами оставлять одну пустую строку.
- В header сохранить `completed/total`; у `Finished` считать completed + cancelled. При отсутствии задач выбранного режима показывать `No active tasks` или `No finished tasks`.

**Файлы для создания/изменения:** `src/todo-view.ts` — `buildTodoView()`; `src/components/sections.tsx` — переключатели, группы и состояние режима в `TodoSection`.

**Документация:** `node_modules/@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts` — `Todo`, четыре текущих статуса и строковый тип status; [Solid Show](https://docs.solidjs.com/reference/components/show).

**Примеры в проекте:** `TodoRow`, `SkillsSection` в `src/components/sections.tsx`; кнопки вкладок в `src/dialogs/settings.tsx`.

**Команды проверки:** `bun run typecheck`; `bun run lint`; `bun run build`.

### Этап 8: Тесты Todo

**Что добавить/реализовать:**

- Проверить режимы, подсчёты, приоритет `in_progress`, исходный порядок, неизвестный статус и дубликаты текста.
- Проверить отдельную группу Cancelled в All/Finished и отсутствие cancelled в Active.
- Проверить фильтр вместе с limit, исчезновение пустых заголовков, корректный header summary и live `todo.updated` при выбранном режиме.
- Проверить клавиатуру и мышь на переключателях; смена target сбрасывает режим и `Show all`. Сохранить покрытие stale refresh и отмены запросов.

**Файлы для создания/изменения:** `test/todo-view.test.ts`, `test/section-interaction.test.tsx`, `test/sidebar-keyboard.test.tsx`, `test/todo-controller.test.ts`.

**Примеры в проекте:** `test/todo-controller.test.ts` — защита от stale refresh; `test/section-interaction.test.tsx` — reactive renderer assertions.

**Команды проверки:** `bun run build`; `bun test --preload @opentui/solid/preload test/todo-view.test.ts test/todo-controller.test.ts test/section-interaction.test.tsx test/sidebar-keyboard.test.tsx`; `bun run typecheck`.

### Этап 9: Наблюдаемые запуски и история Subagents

**Что добавить/реализовать:**

- Создать `SubagentRun` с `sessionID`, `startedAt`, `finishedAt?`, `outcome?: "finished" | "error" | "cancelled"`, `errorMessage?`, `startedBeforeObservation`. Создать `createSubagentHistory({ now })` с публичными `observeStatus(targetKey, sessionID, status)`, `observeError(...)`, `remove(...)`, `active(...)` и `recent(...)`.
- Использовать локальное время получения события. При первом обнаружении уже busy/retry сессии ставить `startedBeforeObservation = true`; для известного перехода idle → busy ставить false. Не использовать `Session.time.created` как начало запуска и `time.updated` как конец.
- Busy ↔ retry сохраняет startedAt. Переход наблюдаемого busy/retry → idle закрывает запуск и добавляет в recent. Первое наблюдение idle без активного запуска не создаёт историю. Повторные idle не дублируют запись.
- `session.error` с sessionID сохраняет ошибку текущего запуска; `MessageAbortedError` отмечать cancelled. Idle после ошибки сохраняет error/cancelled. Ошибку, пришедшую сразу после idle, применять к последнему завершённому запуску этой сессии, если новый запуск ещё не наблюдался. Отсутствующему error payload назначать `Session error`.
- На повторном запуске удалять предыдущую recent-запись этой child session и создавать новое время начала. Хранить последние 10 записей на target, сортировать finishedAt по убыванию, tie-break по sessionID. Удаление child удаляет её активную и recent-запись.
- Встроить историю в `createSubagentController()`: расширить `list(parentID)` метаданными запуска, добавить `recent(parentID)`. История переживает deactivate и переходы между родительскими сессиями в пределах процесса.
- Применять session/error/status события и journal replay так, чтобы stale refresh не завершал новый запуск и не восстанавливал удалённую сессию. Записывать переходы только после проверки request generation.
- Различать подтверждённый idle и отсутствие статуса из-за ошибки. Для полного успешного host status snapshot отсутствие sessionID означает idle. Для dev-team использовать результат успешного запроса его worker; timeout, cooldown и HTTP error не создают завершение. Сохранять последний подтверждённый статус с признаком недоступности worker и последующим восстановлением.
- Хранить явный idle, чтобы `api.state.session.status()` не возвращал устаревший busy вместо уже принятого idle. Добавить error mutation в журналы и подписку на `session.error`; отключать подписки и polling при dispose, исключить дублирующиеся poll timers при смене target.

**Файлы для создания/изменения:** `src/controllers/subagent-history.ts` — модель и reducer API; `src/controllers/subagents.ts` — интеграция истории, статусов, ошибок и remote availability; актуализировать существующие typed row fixtures в тестах.

**Документация:**

- `node_modules/@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts` — `Session`, `SessionStatus`, `EventSessionError` версии `1.18.30`.
- [OpenCode events](https://opencode.ai/docs/plugins/#events) — session.status/error/idle.
- [OpenCode server](https://opencode.ai/docs/server/) — `GET /session/status`, `GET /session/:id/children`.
- [Обработка status/error в OpenCode](https://github.com/anomalyco/opencode/blob/dev/packages/tui/src/feature-plugins/system/notifications.ts) — error имеет приоритет над последующим idle.

**Примеры в проекте:** journals, `fetchDevTeamStatus()` и `activate()` в `src/controllers/subagents.ts`; generation guard в `src/controllers/request-state.ts`.

**Команды проверки:** `bun run typecheck`; `bun run lint`.

### Этап 10: Тесты lifecycle и истории Subagents

**Что добавить/реализовать:**

- Создать тесты истории с управляемым `now`: busy → retry → idle, повторный idle, initial idle, already-busy discovery, повторный запуск, error → idle, idle → error, aborted, отсутствие sessionID/error payload.
- Проверить последние 10, порядок, удаление child, изоляцию target, переход между родителями и пустую историю нового экземпляра контроллера.
- Проверить status/error/delete события во время children/status/worker refresh, late response старого target и сохранение нового запуска при stale snapshot.
- Проверить worker timeout/cooldown без ложного finished, явный idle после восстановления, отсутствие fallback на устаревший host status, отсутствие двойного polling и cleanup таймеров.
- Сохранить существующие проверки loopback URL и `redirect: "error"`.

**Файлы для создания/изменения:** `test/subagent-history.test.ts`, `test/subagent-controller.test.ts`.

**Примеры в проекте:** deferred fetch и `session.deleted` test в `test/subagent-controller.test.ts`; abort-ignoring request test в `test/todo-controller.test.ts`.

**Команды проверки:** `bun test --preload @opentui/solid/preload test/subagent-history.test.ts test/subagent-controller.test.ts`; `bun run typecheck`.

### Этап 11: Время работы, ошибки и recent в Subagents

**Что добавить/реализовать:**

- Создать `formatSubagentDuration(startedAt, now, approximate)` с форматами `12s`, `2m 03s`, `1h 02m`; для already-busy discovery использовать префикс `≥` и считать время с начала наблюдения. Отрицательное значение ограничивать нулём.
- В `SubagentRow` показывать заголовок и компактное время; для retry выводить `Retry #N` и countdown из `status.next`, для execution error — error icon и сообщение, для worker unavailable — отдельное сообщение о недоступности статуса.
- Добавить общий signal времени на `SubagentSection`, обновляемый раз в секунду только при раскрытой секции и наличии видимых активных строк. Останавливать interval при collapse, смене target и unmount через `onCleanup()`.
- Выводить Active, затем Recent. Active с ошибкой и retry показывать перед остальными активными, сохраняя исходный порядок внутри категорий. Recent сортировать по finishedAt; использовать нейтральный `Finished`, `Error` и `Cancelled`, не выдавать idle за подтверждённый успешный результат задачи.
- Применять один общий limit Subagents к объединению Active + Recent; активные идут первыми. Заголовки групп и ошибки загрузки в лимит не включать. Все recent строки открывают соответствующую child session через существующий `controller.open()`.
- Header отображает число активных и recent. Показывать recent при отсутствии active; empty message выводить только когда обе группы пусты. Зафиксировать duration завершённого запуска по finishedAt.

**Файлы для создания/изменения:** `src/subagent-view.ts` — `formatSubagentDuration()` и сортировка строк; `src/components/sections.tsx` — `SubagentRow`, `SubagentSection`, clock и группы.

**Документация:** [Solid cleanup](https://docs.solidjs.com/reference/lifecycle/on-cleanup), [Solid effects](https://docs.solidjs.com/concepts/effects); установленный `SessionStatus.retry.next` в SDK.

**Примеры в проекте:** `TodoRow` — статусные цвета; `McpRow` — inline error; `SubagentSection` — target lifecycle; `SkillRow` — сохранение фокуса при изменении порядка.

**Команды проверки:** `bun run typecheck`; `bun run lint`; `bun run build`.

### Этап 12: UI и performance-тесты Subagents

**Что добавить/реализовать:**

- Проверить форматы duration, признаки приблизительного времени, нулевой countdown и зафиксированное время recent.
- В renderer проверить Active/Recent, error/cancelled, сохранение error после idle, открытие child, лимиты и `Show all / Show less`, отсутствие пустых заголовков.
- Проверить реальную keyboard selection при перестановке active/recent, исчезновении child и сворачивании списка; фокус не переходит в другую секцию неожиданно.
- Проверить прекращение тиков после collapse/unmount и отсутствие новых сетевых запросов от UI clock. При обновлении времени не пересоздавать все строки и navigation descriptors.
- Обновить тест 500 subagents для нового row shape и обоих режимов All/limited. Проверить plugin dispose с активным polling и clock.

**Файлы для создания/изменения:** `test/subagent-view.test.ts`, `test/section-interaction.test.tsx`, `test/sidebar-keyboard.test.tsx`, `test/section-performance.test.tsx`, `test/plugin-smoke.test.tsx`.

**Примеры в проекте:** renderer/keyboard harness в `test/sidebar-keyboard.test.tsx`; полный mount/dispose в `test/plugin-smoke.test.tsx`.

**Команды проверки:** `bun run build`; `bun test --preload @opentui/solid/preload test/subagent-view.test.ts test/section-interaction.test.tsx test/sidebar-keyboard.test.tsx test/section-performance.test.tsx test/plugin-smoke.test.tsx`; `bun run typecheck`.

### Этап 13: Документация и итоговая проверка

**Что добавить/реализовать:**

- Обновить README: Todo-фильтры, cancelled в Finished, session-local режим фильтра, наблюдаемое время subagent, in-memory recent, шесть независимых лимитов, default All, пример `section_item_limits` и семантика global/worktree reset.
- Обновить roadmap только по реализованным пунктам; оставить расширенный поиск/фильтры Subagents и остальные направления отдельными будущими задачами.
- Дополнить keyboard help переключателями Todo и `Show all / Show less`; описать применение лимита после фильтрации.
- Зафиксировать raw bundle budget `240_000` bytes для этого набора функций в `scripts/check-bundle-size.ts` и ROADMAP. Сохранить external Solid/OpenTUI, неминифицированную сборку и минимальную версию OpenCode `1.18.30`.
- Отформатировать изменённые TS/TSX-файлы, выполнить полный quality gate и PTY smoke. Проверить package dry run: LICENSE, README, package.json, dist/tui.js.
- Вручную проверить узкий sidebar: фильтры, длинные названия, лимит 1 и All, переключение сессий, recent/error, управление мышью и клавиатурой. Проверить, что сохранение лимитов не меняет visibility/order/layout presets.
- Отметить все проверенные этапы в tracking-файле. Подготовку номера версии и публикацию выполнять по отдельной команде на релиз.

**Файлы для изменения:** `README.md`, `ROADMAP.md`, `src/dialogs/keyboard-help.tsx`, `scripts/check-bundle-size.ts`, `vibe/sidebar-v0.9.0-plan-track.md`.

**Примеры в проекте:** `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `scripts/smoke-opencode.sh`, `scripts/check-bundle-size.ts`.

**Команды проверки:** `bun run check`; `bun run test:e2e`; `git diff --check`; `npm pack --dry-run --ignore-scripts --json`.
