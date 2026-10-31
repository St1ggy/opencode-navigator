send -- "\033\[44;5u"
expect {
  -re {Navigator settings} {}
  timeout { puts stderr "Settings did not open for About"; exit 1 }
  eof { puts stderr "Host exited before About"; exit 1 }
}
after 200
send -- "\t\t\t\t\t"
expect {
  -re {Changelog by version} {}
  timeout { puts stderr "About tab did not render"; exit 1 }
}
after 150
send -- "\033\[B\033\[B\r"
expect {
  -re {Navigator changelog} {}
  timeout { puts stderr "Versioned changelog did not open"; exit 1 }
}
expect {
  -re {navigate} {}
  timeout { puts stderr "Version menu did not finish loading"; exit 1 }
}
after 150
send -- "\r"
expect {
  -re {scroll} {}
  timeout { puts stderr "Version details did not open"; exit 1 }
}
send -- "\033\[27u"
after 200
send -- "\033\[27u"
expect {
  -re {Navigator settings} {}
  timeout { puts stderr "Changelog did not return to About"; exit 1 }
}
after 150
send -- "\033\[B\r"
expect {
  -re {Issue title} {}
  timeout { puts stderr "Bug report editor did not open"; exit 1 }
}
expect {
  -re {Ready} {}
  timeout { puts stderr "Synthetic gh readiness did not resolve"; exit 1 }
}
send -- "Synthetic smoke report"
expect {
  -re {Synthetic smoke report} {}
  timeout { puts stderr "Bug report title did not accept input"; exit 1 }
}
send -- "\r"
after 100
send -- "First body line\rSecond body line"
expect {
  -re {Second body line} {}
  timeout { puts stderr "Multiline report did not accept a newline"; exit 1 }
}
send -- "\t\r"
expect {
  -re {Type: Bug} {}
  timeout { puts stderr "Bug report preview did not open"; exit 1 }
}
send -- "\033\[27u"
expect {
  -re {Issue title|Check GitHub CLI} {}
  timeout { puts stderr "Bug report preview did not restore the editor"; exit 1 }
}
send -- "\033\[27u"
expect {
  -re {Navigator settings} {}
  timeout { puts stderr "Bug report cancellation did not return to About"; exit 1 }
}
send -- "\033\[27u"
after 200
