"""Drive the fixed synthetic Desktop profile without enabling remote debugging."""

import os
import subprocess
import time

import pyatspi


def named_nodes(root, depth=0):
    if root is None or depth > 30:
        return
    try:
        if root.name:
            yield root
        for child in root:
            yield from named_nodes(child, depth + 1)
    except (RuntimeError, TypeError, LookupError):
        return


def wait(label, *, prefix=False, role=None, showing=True, seconds=25):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        for node in named_nodes(pyatspi.Registry.getDesktop(0)):
            matches = node.name.startswith(label) if prefix else node.name == label
            if (
                matches
                and (role is None or node.getRole() == role)
                and (not showing or node.getState().contains(pyatspi.STATE_SHOWING))
            ):
                return node
        time.sleep(0.2)
    names = {node.name for node in named_nodes(pyatspi.Registry.getDesktop(0))}
    raise AssertionError(f"Missing {label!r} in synthetic Desktop: {sorted(names)[:100]}")


def input_key(*args):
    subprocess.run(("xdotool", *args), check=True, timeout=10)


def click_node(node):
    action = node.queryAction()
    for index in range(action.nActions):
        if action.getName(index) in ("click", "press", "activate"):
            assert action.doAction(index), f"Could not activate {node.name!r}"
            return

    box = node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
    assert box.width > 0 and box.height > 0, f"Invalid bounds for {node.name!r}: {box}"
    input_key("mousemove", str(box.x + box.width // 2), str(box.y + box.height // 2))
    input_key("click", "1")


def click(label):
    click_node(wait(label))


def command(label):
    input_key("key", "--clearmodifiers", "ctrl+shift+p")
    wait("Search files, commands, and sessions")
    input_key("type", label)
    wait(label)
    input_key("key", "Return")


def main():
    wait("Prompt", seconds=45)
    windows = subprocess.check_output(
        ("xdotool", "search", "--onlyvisible", "--name", "OpenCode"), text=True, timeout=10
    ).splitlines()
    assert windows, "Missing packaged Desktop window on the virtual display"
    input_key("windowfocus", "--sync", windows[-1])

    command("Navigator version")
    wait("Navigator " + os.environ["NAVIGATOR_VERSION"])
    command("Create synthetic monitoring session")
    wait("Synthetic monitoring session", prefix=True)
    command("Open Navigator")
    wait("Todo")
    subagents = wait("Subagents", prefix=True, role=pyatspi.ROLE_PUSH_BUTTON)
    if not subagents.getState().contains(pyatspi.STATE_EXPANDED):
        click_node(subagents)
    wait("Filter Subagents")
    wait("Synthetic child session", role=pyatspi.ROLE_PUSH_BUTTON, showing=False)

    if os.environ.get("NAVIGATOR_GUI_QUOTA_FIXTURE") == "1":
        click("Synthetic fixture commands")
        click("Select synthetic quota model")
        click("Link Codex account")
        wait("synthetic-account")
        click("Link account")
        wait("Credits: 1234.57")
        wait("Banked Resets (1)")

    print("Packaged OpenCode Desktop accessibility smoke passed.", flush=True)


if __name__ == "__main__":
    main()
