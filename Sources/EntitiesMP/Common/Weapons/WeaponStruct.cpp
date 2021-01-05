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
#define AP(_Ammo) (&_aWeaponAmmo[_Ammo])

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

// Constructor
SWeaponAmmo::SWeaponAmmo(CTString strSetIcon, INDEX iSetAmmo, FLOAT fSetMana, CTString strSetPickup) :
  SWeaponBase(0, strSetIcon, fSetMana, strSetPickup)
{
  AddIcon(strSetIcon, _aAmmoIcons);

  // ammo multiplier
  FLOAT fModifier = ClampDn(GetSP()->sp_fAmmoQuantity, 1.0f) * AmmoMul();
  INDEX iTopAmmo = Floor(1000.0f * AmmoMul());

  // set max ammo and in a pack
  iAmount = ClampUp(INDEX(ceil(iSetAmmo * fModifier)), iTopAmmo);
};

// Write and read
void SWeaponAmmo::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << iAmount;
};

void SWeaponAmmo::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> iAmount;

  AddIcon(strIcon, _aAmmoIcons);
};

// Write and read weapon properties
void SWeaponStruct::Write(CTStream *strm) {
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

// Parse weapon config
BOOL ParseWeaponConfig(SWeaponStruct &ws, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }

  // get weapon positions
  GetConfigVector(cb, "Pos1", ws.wpsPos.Pos1());
  GetConfigVector(cb, "Rot1", ws.wpsPos.Rot1());
  GetConfigVector(cb, "Pos3", ws.wpsPos.Pos3());
  GetConfigVector(cb, "Rot3", ws.wpsPos.Rot3());

  GetConfigVector(cb, "PosFire", ws.wpsPos.vFire);
  cb.GetValue("FOV", ws.wpsPos.fFOV);

  // get ammo
  int iAmmo = -1;
  int iAlt = -1;
  int iPickupAmmo = -1;
  int iPickupAlt = -1;

  cb.GetValue("Ammo", iAmmo);
  cb.GetValue("AltAmmo", iAlt);
  cb.GetValue("PickupAmmo", iPickupAmmo);
  cb.GetValue("PickupAlt", iPickupAlt);
  
  ws.pAmmo = (iAmmo != -1 ? AP(iAmmo) : NULL);
  ws.pAlt = (iAlt != -1 ? AP(iAlt) : NULL);
  ws.iPickup = ceil(iPickupAmmo * AmmoMul());
  ws.iPickupAlt = ceil(iPickupAlt * AmmoMul());

  // other
  GetConfigString(cb, "Name", ws.strPickup);
  GetConfigString(cb, "Icon", ws.strIcon);
  cb.GetValue("Mana", ws.fMana);

  // included configs
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseWeaponConfig(ws, strConfig);
  }

  return TRUE;
};

// Load weapons and ammo for this world
extern void LoadWorldWeapons(CWorld *pwo) {
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmShells.tex",        MAX_SHELLS,        AV_SHELLS,        "Shells"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmBullets.tex",       MAX_BULLETS,       AV_BULLETS,       "Bullets"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmRockets.tex",       MAX_ROCKETS,       AV_ROCKETS,       "Rockets"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmGrenades.tex",      MAX_GRENADES,      AV_GRENADES,      "Grenades"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmFuelReservoir.tex", MAX_NAPALM,        AV_NAPALM,        "Napalm"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmSniperBullets.tex", MAX_SNIPERBULLETS, AV_SNIPERBULLETS, "Sniper Bullets"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmElectricity.tex",   MAX_ELECTRICITY,   AV_ELECTRICITY,   "Electricity"));
  AddAmmo(SWeaponAmmo("TexturesMP\\Interface\\AmCannonBall.tex",    MAX_IRONBALLS,     AV_IRONBALLS,     "Cannon Balls"));
  
  // add empty weapon
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV, NULL, NULL, "", 0, 0, 0.0f, ""));
  
  // load the default set
  CDynamicStackArray<CTFileName> aList;
  MakeDirList(aList, CTFILENAME("Scripts\\WeaponSets\\Default\\"), "*.json", 0);

  // go through the files
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
