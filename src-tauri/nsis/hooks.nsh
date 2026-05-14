!macro NSIS_HOOK_PREINSTALL

!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Politely ask Windows to refresh shell icon caches so the taskbar picks up
  ; the new app icon after an in-place auto-update at the same .exe path.
  ; Windows otherwise keeps the previously cached icon until the next reboot.
  ; SHCNE_ASSOCCHANGED (0x08000000): system-wide hint that associations changed
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
  ; SHCNE_UPDATEDIR (0x00001000) with SHCNF_PATHW (0x0005): scoped hint that the
  ; install directory contents changed
  System::Call 'shell32::SHChangeNotify(i 0x00001000, i 0x0005, w "$INSTDIR", i 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL

!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete /REBOOTOK "$INSTDIR\WinDivert64.sys"
!macroend