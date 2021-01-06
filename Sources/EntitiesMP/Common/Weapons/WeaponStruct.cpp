#include "StdH.h"
#include "WeaponStruct.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

// Weapon ammo and properties for the world
extern CDList<SWeaponAmmo> _aWeaponAmmo = CDList<SWeaponAmmo>();
extern CDList<SWeaponStruct> _aPlayerWeapons = CDList<SWeaponStruct>();
extern CWeaponIcons _aAmmoIcons = CWeaponIcons();
extern CWeaponIcons _aWeaponIcons = CWeaponIcons();

// Ammo pointer
#define AP(_Ammo) (_Ammo < _aWeaponAmmo.Count() ? &_aWeaponAmmo[_Ammo] : NULL)

// Set icon
void SWeaponBase::AddIcon(CTString strSetIcon, CWeaponIcons &aIcons) {
  // empty icon
  if (strSetIcon == "") {
    ptoIcon = NULL;
    aIcons.Add(NULL);
    return;
  }

  // already added
  if (ptoIcon != NULL) {
    return;
  }

  // add new icon
  try {
    ptoIcon = new CTextureObject;

    ptoIcon->SetData_t(CTFileName(strSetIcon));
    ((CTextureData*)ptoIcon->GetData())->Force(TEX_CONSTANT);

    aIcons.Add(ptoIcon);

  } catch (char *strError) {
    FatalError(strError);
  }
};

// Write and read
void SWeaponAmmo::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << iMaxAmount;
  *strm << bDisplay;
};

void SWeaponAmmo::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> iMaxAmount;
  *strm >> bDisplay;
};

// Set max ammo
void SWeaponAmmo::SetAmmo(INDEX iSet) {
  // ammo multiplier
  FLOAT fModifier = ClampDn(GetSP()->sp_fAmmoQuantity, 1.0f) * AmmoMul();
  INDEX iTopAmmo = Floor(1000.0f * AmmoMul());

  // set max ammo
  iMaxAmount = ClampUp(INDEX(ceil(iSet * fModifier)), iTopAmmo);
};

// Write and read weapon properties
void SWeaponStruct::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << wpsPos.plPos;
  *strm << wpsPos.plThird;
  *strm << wpsPos.vFire;
  *strm << strPickup;

  // ammo position in the list
  if (pAmmo != NULL) {
    *strm << _aWeaponAmmo.FindIndex(*pAmmo);
  } else {
    *strm << INDEX(-1);
  }

  if (pAlt != NULL) {
    *strm << _aWeaponAmmo.FindIndex(*pAlt);
  } else {
    *strm << INDEX(-1);
  }
};

void SWeaponStruct::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> wpsPos.plPos;
  *strm >> wpsPos.plThird;
  *strm >> wpsPos.vFire;
  *strm >> strPickup;

  INDEX iAmmo, iAlt;
  *strm >> iAmmo;
  *strm >> iAlt;

  // set ammo
  if (iAmmo != -1) {
    pAmmo = &_aWeaponAmmo[iAmmo];
  }
  if (iAlt != -1) {
    pAlt = &_aWeaponAmmo[iAlt];
  }
};

// Add new ammo to the list
void AddAmmo(SWeaponAmmo &wa) {
  int iAmmo = _aWeaponAmmo.Add(wa);

  // set ID of the added ammo
  SWeaponAmmo &waAdded = _aWeaponAmmo[iAmmo];
  waAdded.ulID = iAmmo;

  // create the icon
  waAdded.AddIcon(waAdded.strIcon, _aWeaponIcons);
};

// Add new weapon to the list
void AddWeapon(SWeaponStruct &wp) {
  int iWeapon = _aPlayerWeapons.Add(wp);

  // set ID of the added weapon
  SWeaponStruct &wsAdded = _aPlayerWeapons[iWeapon];
  wsAdded.ulID = iWeapon;

  // create the icon
  wsAdded.AddIcon(wsAdded.strIcon, _aWeaponIcons);
};

// Parse ammo config
BOOL ParseAmmoConfig(SWeaponAmmo &wa, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }
  
  // included config
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseAmmoConfig(wa, strConfig);
  }

  // ammo properties
  GetConfigString(cb, "Name", wa.strPickup);
  GetConfigString(cb, "Icon", wa.strIcon);

  int iDisplay = 1;
  if (cb.GetValue("Display", iDisplay)) {
    wa.bDisplay = iDisplay;
  }

  // pickup values
  int iAmmo = 0;
  CConfigValue valMana;

  if (cb.GetValue("Ammo", iAmmo)) {
    wa.SetAmmo(iAmmo);
  }
  if (cb.GetValue("Mana", valMana)) {
    wa.fMana = valMana.GetNumber();
  }

  return TRUE;
};

// Parse weapon config
BOOL ParseWeaponConfig(SWeaponStruct &ws, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }

  // included config
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseWeaponConfig(ws, strConfig);
  }

  CConfigValue val;

  // get weapon positions
  GetConfigVector(cb, "Pos1", ws.wpsPos.Pos1());
  GetConfigVector(cb, "Rot1", ws.wpsPos.Rot1());
  GetConfigVector(cb, "Pos3", ws.wpsPos.Pos3());
  GetConfigVector(cb, "Rot3", ws.wpsPos.Rot3());
  GetConfigVector(cb, "PosFire", ws.wpsPos.vFire);

  if (cb.GetValue("FOV", val)) {
    ws.wpsPos.fFOV = val.GetNumber();
  }

  // get ammo
  int iAmmo = -1;
  int iAlt = -1;
  int iMag = 0;
  int iPickupAmmo = -1;
  int iPickupAlt = -1;

  if (cb.GetValue("Ammo", iAmmo)) {
    ws.pAmmo = (iAmmo != -1 ? AP(iAmmo) : NULL);
  }
  if (cb.GetValue("AltAmmo", iAlt)) {
    ws.pAlt = (iAlt != -1 ? AP(iAlt) : NULL);
  }
  if (cb.GetValue("Mag", iMag)) {
    ws.iMaxMag = ceil(iMag * AmmoMul());
  }
  if (cb.GetValue("PickupAmmo", iPickupAmmo)) {
    ws.iPickup = ceil(iPickupAmmo * AmmoMul());
  }
  if (cb.GetValue("PickupAlt", iPickupAlt)) {
    ws.iPickupAlt = ceil(iPickupAlt * AmmoMul());
  }

  // other
  GetConfigString(cb, "Name", ws.strPickup);
  GetConfigString(cb, "Icon", ws.strIcon);

  if (cb.GetValue("Mana", val)) {
    ws.fMana = val.GetNumber();
  }

  return TRUE;
};

// Load weapons and ammo for this world
extern void LoadWorldWeapons(CWorld *pwo) {
  // load default sets
  CDynamicStackArray<CTFileName> aList;

  // go through ammo configs
  MakeDirList(aList, CTFILENAME("Scripts\\AmmoSets\\Default\\"), "*.json", 0);

  for (INDEX iAmmo = 0; iAmmo < aList.Count(); iAmmo++) {
    CTString strFile = aList[iAmmo].str_String;

    // parse the config
    SWeaponAmmo waAmmo;
    ParseAmmoConfig(waAmmo, strFile);

    // add the ammo
    AddAmmo(waAmmo);
  }
  
  // add empty weapon
  AddWeapon(SWeaponStruct(NULL, NULL, "", ""));
  
  // go through weapon configs
  MakeDirList(aList, CTFILENAME("Scripts\\WeaponSets\\Default\\"), "*.json", 0);
  HookConfigFunctions();

  for (INDEX iWeapon = 0; iWeapon < aList.Count(); iWeapon++) {
    CTString strFile = aList[iWeapon].str_String;

    // parse the config
    SWeaponStruct wsStruct;
    ParseWeaponConfig(wsStruct, strFile);

    // add the weapon
    AddWeapon(wsStruct);
  }
};

// Weapons and ammo cleanup
extern void ClearWorldWeapons(void) {
  _aWeaponAmmo.Clear();
  _aPlayerWeapons.Clear();

  // delete icons
  INDEX iIcon;

  for (iIcon = 0; iIcon < _aAmmoIcons.Count(); iIcon++) {
    delete _aAmmoIcons[iIcon];
    _aAmmoIcons[iIcon] = NULL;
  }
  _aAmmoIcons.Clear();

  for (iIcon = 0; iIcon < _aWeaponIcons.Count(); iIcon++) {
    delete _aWeaponIcons[iIcon];
    _aWeaponIcons[iIcon] = NULL;
  }
  _aWeaponIcons.Clear();
};
