#include "StdH.h"
#include "WeaponBase.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

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

// World functions

// Ammo pointer
#define AP(_Ammo) (_Ammo < _awaWeaponAmmo.Count() ? &_awaWeaponAmmo[_Ammo] : NULL)

// Add new ammo to the list
void AddAmmo(SWeaponAmmo &wa) {
  int iAmmo = _awaWeaponAmmo.Add(wa);

  // set ID of the added ammo
  SWeaponAmmo &waAdded = _awaWeaponAmmo[iAmmo];
  waAdded.ulID = iAmmo;

  // create the icon
  waAdded.AddIcon(waAdded.strIcon, _aWeaponIcons);
};

// Add new weapon to the list
void AddWeapon(SWeaponStruct &wp) {
  int iWeapon = _awsPlayerWeapons.Add(wp);

  // set ID of the added weapon
  SWeaponStruct &wsAdded = _awsPlayerWeapons[iWeapon];
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
    ws.pwaAmmo = (iAmmo != -1 ? AP(iAmmo) : NULL);
  }

  if (cb.GetValue("AltAmmo", iAlt)) {
    ws.pwaAlt = (iAlt != -1 ? AP(iAlt) : NULL);
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

  // damage
  if (cb.GetValue("Damage", val)) {
    ws.fDamage = val.GetNumber();
  }

  if (cb.GetValue("DamageDM", val)) {
    ws.fDamageDM = val.GetNumber();
  }

  if (cb.GetValue("DamageAlt", val)) {
    ws.fDamageAlt = val.GetNumber();
  }

  if (cb.GetValue("DamageAltDM", val)) {
    ws.fDamageAltDM = val.GetNumber();
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
  _awaWeaponAmmo.Clear();
  _awsPlayerWeapons.Clear();

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
