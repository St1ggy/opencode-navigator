send -- "\r"
expect {
  -re {Icons and text} {}
  timeout { puts stderr "Pin configuration did not return from its icon picker"; exit 1 }
}
after 100
send -- "\033\[B\033\[B\r"
expect {
  -re {Base icons} {}
  timeout { puts stderr "Toolbar appearance editor did not open"; exit 1 }
}
send -- "\033\[B\r"
expect {
  -re {128 characters} {}
  timeout { puts stderr "Toolbar text prompt did not open"; exit 1 }
}
send -- "Smoke label\r"
expect {
  -re {Base icons} {}
  timeout { puts stderr "Toolbar text prompt did not restore its parent"; exit 1 }
}
send -- "\033\[27u"
after 200
send -- "\033\[A\r"
after 200
