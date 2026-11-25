proc wait_smoke_frame {pattern message} {
  global env
  if {![info exists env(OPENCODE_V2_SMOKE_TRANSCRIPT)]} {
    expect -re $pattern { return } timeout { puts stderr $message; exit 1 } eof { puts stderr $message; exit 1 }
  }

  set deadline [expr {[clock milliseconds] + 15000}]
  while {[clock milliseconds] < $deadline} {
    expect -timeout 1 {
      -re {.+} {}
      timeout {}
      eof { puts stderr $message; exit 1 }
    }
    log_file
    set frame [exec bun $env(NAVIGATOR_SMOKE_FRAME_SCRIPT) $env(OPENCODE_V2_SMOKE_TRANSCRIPT)]
    log_file -a $env(OPENCODE_V2_SMOKE_TRANSCRIPT)
    if {[regexp -- $pattern $frame]} { return }
  }
  puts stderr $message
  exit 1
}
