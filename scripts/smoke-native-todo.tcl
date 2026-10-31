set config_file [open $env(OPENCODE_V2_SMOKE_SERVER_CONFIG) r]
set original_config [read $config_file]
close $config_file

proc settle_native_todo_ui {} {
  set deadline [expr {[clock milliseconds] + 500}]
  while {[clock milliseconds] < $deadline} {
    # Drain the PTY during settling: V2 blocks rendering/focus on a full output pipe.
    expect -timeout 1 {
      -re {.+} {}
      timeout {}
      eof { puts stderr "Host exited during Todo setup"; exit 1 }
    }
  }
}

proc wait_native_todo_frame {label} {
  global env
  set deadline [expr {[clock milliseconds] + 15000}]
  while {[clock milliseconds] < $deadline} {
    expect -timeout 1 {
      -re {.+} {}
      timeout {}
      eof { puts stderr "Host exited while waiting for Todo setup"; exit 1 }
    }
    log_file
    set frame [exec bun $env(NAVIGATOR_SMOKE_FRAME_SCRIPT) $env(OPENCODE_V2_SMOKE_TRANSCRIPT)]
    log_file -a $env(OPENCODE_V2_SMOKE_TRANSCRIPT)
    if {[string first $label $frame] >= 0} { return }
  }
  puts stderr "Todo setup frame did not show $label"
  exit 1
}

proc open_native_todo_setup {} {
  global timeout
  set timeout 30
  set watchdog [after 30000 { puts stderr "Todo setup navigation exceeded its deadline"; exit 1 }]
  send -- "\033\[112;5u"
  # Warm host palettes can reuse the previous title's cells, so ANSI deltas do
  # not necessarily contain the complete title again. Verify the target below.
  wait_native_todo_frame "Commands"
  send -- "Enable native Todo"
  settle_native_todo_ui
  send -- "\r"
  wait_native_todo_frame "Choose Todo configuration"
  settle_native_todo_ui
  send -- "\r"
  wait_native_todo_frame "experimental.todo"
  after cancel $watchdog
}

open_native_todo_setup
send -- "\033\[27u"
wait_native_todo_frame "Choose Todo configuration"
send -- "\033\[27u"
after 250
set config_file [open $env(OPENCODE_V2_SMOKE_SERVER_CONFIG) r]
set cancelled_config [read $config_file]
close $config_file
if {$cancelled_config ne $original_config} {
  puts stderr "Cancelled Todo setup changed the server configuration"
  exit 1
}

open_native_todo_setup
send -- "\033\[C"
after 100
send -- "\r"
expect {
  -re {Native Todo enabled} {}
  timeout { puts stderr "Confirmed native Todo configuration update did not succeed"; exit 1 }
}
after 250
