source [file join [file dirname [info script]] smoke-wait-frame.tcl]
send -- "\033\[44;5u"
wait_smoke_frame {Navigator settings} {Settings did not open for About}
after 200
send -- "\t\t\t\t\t"
wait_smoke_frame {Changelog by version} {About tab did not render}
after 150
send -- "\033\[B\r"
wait_smoke_frame {Navigator changelog} {Versioned changelog did not open}
wait_smoke_frame {navigate} {Version menu did not finish loading}
after 150
send -- "\r"
wait_smoke_frame {scroll} {Version details did not open}
send -- "\033\[27u"
after 200
send -- "\033\[27u"
wait_smoke_frame {Navigator settings} {Changelog did not return to About}
after 150
send -- "\033\[B\r"
wait_smoke_frame {Issue title} {Bug report editor did not open}
wait_smoke_frame {Ready} {Synthetic gh readiness did not resolve}
send -- "Synthetic smoke report"
wait_smoke_frame {Synthetic smoke report} {Bug report title did not accept input}
send -- "\r"
after 100
send -- "First body line\rSecond body line"
wait_smoke_frame {Second body line} {Multiline report did not accept a newline}
send -- "\t\r"
wait_smoke_frame {Type: Bug} {Bug report preview did not open}
send -- "\033\[27u"
wait_smoke_frame {Issue title|Check GitHub CLI} {Bug report preview did not restore the editor}
send -- "\033\[27u"
wait_smoke_frame {Navigator settings} {Bug report cancellation did not return to About}
send -- "\033\[27u"
after 200
