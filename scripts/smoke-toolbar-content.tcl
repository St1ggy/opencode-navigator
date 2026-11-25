source [file join [file dirname [info script]] smoke-wait-frame.tcl]
send -- "\r"
wait_smoke_frame {Icons and text} {Pin configuration did not return from its icon picker}
after 100
send -- "\033\[B\033\[B\r"
wait_smoke_frame {Base icons} {Toolbar appearance editor did not open}
send -- "\033\[B\r"
wait_smoke_frame {128 characters} {Toolbar text prompt did not open}
send -- "Smoke label\r"
wait_smoke_frame {Base icons} {Toolbar text prompt did not restore its parent}
send -- "\033\[27u"
after 200
send -- "\033\[A\r"
after 200
