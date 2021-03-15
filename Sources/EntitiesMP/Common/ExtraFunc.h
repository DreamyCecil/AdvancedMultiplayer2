// [Cecil] Weapon flags
inline INDEX WeaponFlag(const INDEX &iWeapon) {
  return (1 << (iWeapon-1));
};

inline BOOL WeaponExists(const INDEX &iFlags, const INDEX &iWeapon) {
  return (iFlags & WeaponFlag(iWeapon));
};

// [Cecil] Properly remove decorations from the string
DECL_DLL void ProperUndecorate(CTString &str);

// [Cecil] Get first alive player
DECL_DLL CEntity *GetFirstPlayer(const CTString &strExecutor = "<unknown>");
