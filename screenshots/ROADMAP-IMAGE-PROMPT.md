# Roadmap Image Prompt

## Reference Images

Upload this prompt together with the following files from the same directory:

- `01-hero-sidebar.png` - primary reference for the application layout, colors, typography, and sidebar proportions.
- `03-layout-settings.png` - reference for settings, selectable rows, and modal composition.
- `04-skills-search.png` - reference for searchable sidebar sections.
- `05-mcp-search.png` - reference for MCP rows, search, and connection indicators.
- `06-setup-guide.png` - reference for onboarding and section selection.
- `07-live-subagent.png` - reference for live agent states and the Subagents section.

Do not use `02-default-sidebar-before.png`: it shows the sidebar before the plugin is applied.

```text
Создай премиальную горизонтальную roadmap-инфографику для проекта «opencode-pretty-sidebar» в формате 16:9.

Используй приложенные демо-скриншоты как строгий визуальный референс текущего продукта: сохрани графитовую палитру, моноширинную типографику, тонкие рамки, компактные строки, цветные status-индикаторы и реальные пропорции сайдбара. Не копируй из скриншотов текст чата, пользовательские запросы, пути к файлам, названия демо-задач и другие случайные данные. Скриншоты задают визуальный язык продукта, а содержимое итоговой инфографики определяется только этим промптом.

Концепция: развитие интерактивного сайдбара для OpenCode TUI. Визуальный стиль современного терминального интерфейса: глубокий графитовый фон, тонкая сетка, панели с мягким свечением, аккуратные пиксельные и terminal-style элементы, акцентные цвета cyan, violet, lime и amber. Чёткая типографика, высокий контраст, минимум декоративного шума. Изображение должно выглядеть как продуманный интерфейс developer tool, а не как корпоративная презентация.

Заголовок:
OPENCODE PRETTY SIDEBAR
Product Roadmap

Покажи развитие слева направо в виде связанной последовательности из семи крупных модулей. Не использовать даты, годы, месяцы, кварталы, календарь или временную шкалу.

1. ПРЕСЕТЫ И ЛЕЙАУТЫ
• Layout-пресеты: Minimal, Coding, Agents, Full
• Пользовательские пресеты
• Порядок секций и плотность интерфейса
• Настройки глобально и для worktree
• MCP-пресеты enabled/disabled серверов
• Preview изменений и массовое применение

2. КЛАВИАТУРНАЯ НАВИГАЦИЯ
• Полное управление без мыши
• Переход между секциями и строками
• Горячие клавиши
• Focus, hover и pending states
• Встроенная подсказка управления

3. УЛУЧШЕНИЕ СЕКЦИЙ
Покажи шесть компактных подпунктов с иконками:
• Todo: фильтры, группировка, прогресс
• Subagents: runtime, статусы, ошибки
• Skills: избранное, история, fuzzy search
• Quick Actions: настройка и собственные команды
• LSP: сортировка, детали, ошибки
• MCP: группировка, retry, bulk actions

4. АГЕНТЫ И ЛИМИТЫ
Раздели модуль на три визуальных источника:
• OpenCode Agents: активный агент, модель, провайдер
• Provider Quotas: OpenAI, Anthropic, Google
• External CLIs: Claude Code, Codex CLI, Gemini CLI

Добавь компактные индикаторы лимитов:
• Used / Remaining
• Reset window
• Data freshness
• Warning threshold

Покажи, что данные нормализуются через независимые adapters. Не изображай и не упоминай API-ключи или credentials.

5. ЕДИНЫЙ ПОИСК
• Skills, Subagents, MCP и Actions
• Fuzzy matching
• Группировка результатов
• Recent selections
• Keyboard-first управление

6. ПРОФИЛИ И ПЕРЕНОСИМОСТЬ
• Импорт и экспорт JSON
• Project-local profiles
• Layout и MCP-пресеты
• Версионированная схема настроек
• Global / Worktree / Project scope

7. STABLE 1.0
• Модульная архитектура
• Actionable error states
• Защита от stale requests
• E2E и performance tests
• Accessibility
• CI, bundle tracking и release notes

Внизу добавь короткий слоган:
A compact control center for every OpenCode session

Композиция должна легко читаться при уменьшении. Используй крупные заголовки, короткие подписи, единый набор outline-иконок и визуальные соединения между этапами. Не перегружай карточки текстом. Не использовать даты, номера кварталов, дедлайны, диаграмму Ганта, фотографии людей, 3D-персонажей, стандартные офисные иллюстрации или случайные логотипы. Весь текст должен быть написан без ошибок и оставаться разборчивым.
```
