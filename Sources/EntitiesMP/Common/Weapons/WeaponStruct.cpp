#include "StdH.h"
#include "WeaponStruct.h"

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

  // Ammo multiplier
  FLOAT fModifier = ClampDn(GetSP()->sp_fAmmoQuantity, 1.0f) * AmmoMul();
  INDEX iTopAmmo = Floor(1000.0f * AmmoMul());

  // Set max ammo and in a pack
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

// Constructor
SWeaponStruct::SWeaponStruct(CPlacement3D plSetFirst, CPlacement3D plSetThird, FLOAT3D vSetFire,
                             SWeaponAmmo *pSetAmmo, SWeaponAmmo *pSetAlt, CTString strSetIcon,
                             INDEX iSetPickup, INDEX iSetPickupAlt, FLOAT fSetMana, CTString strSetPickup) :
  SWeaponBase(0, strSetIcon, fSetMana, strSetPickup), wpPos(plSetFirst, plSetThird, vSetFire),
  pAmmo(pSetAmmo), pAlt(pSetAlt)
{
  AddIcon(strSetIcon, _aWeaponIcons);

  // Set pickup ammo
  iPickup = ceil(iSetPickup * AmmoMul());
  iPickupAlt = ceil(iSetPickupAlt * AmmoMul());
};

// Write and read weapon properties
void SWeaponStruct::Write(CTStream *strm) {
  *strm << wpPos.plPos;
  *strm << wpPos.plThird;
  *strm << wpPos.vFire;
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
  *strm >> wpPos.plPos;
  *strm >> wpPos.plThird;
  *strm >> wpPos.vFire;
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
  SWeaponStruct &wpAdded = _aPlayerWeapons[iWeapon];
  wpAdded.ulID = iWeapon;
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
  
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS,  NULL,  NULL, "", 0, 0, 0.0f, ""));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS,  NULL,  NULL, "TexturesMP\\Interface\\WKnife.tex",             0, 0,   0.0f, "Military Knife"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS,  NULL,  NULL, "TexturesMP\\Interface\\WColt.tex",              0, 0,   0.0f, "Shofield .45 w/ TMAR"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS,  NULL,  NULL, "TexturesMP\\Interface\\WColt.tex",              0, 0,   0.0f, "Shofield .45 w/ TMAR"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(0), AP(3), "TexturesMP\\Interface\\WSingleShotgun.tex",    10, 3,  70.0f, "12 Gauge Pump Action Shotgun"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(0),  NULL, "TexturesMP\\Interface\\WDoubleShotgun.tex",    20, 0,  70.0f, "Double Barrel Coach Gun"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(1),  NULL, "TexturesMP\\Interface\\WTommygun.tex",         50, 0,  10.0f, "M1-A2 Tommygun"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(1),  NULL, "TexturesMP\\Interface\\WMinigun.tex",         100, 0,  10.0f, "XM214-A Minigun"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(2),  NULL, "TexturesMP\\Interface\\WRocketLauncher.tex",    5, 0, 150.0f, "XPML21 Rocket Launcher"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(3),  NULL, "TexturesMP\\Interface\\WGrenadeLauncher.tex",   5, 0, 100.0f, "MKIII Grenade Launcher"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS,  NULL,  NULL, "TexturesMP\\Interface\\WChainsaw.tex",          0, 0,   0.0f, "'Bonecracker' P-LAH Chainsaw"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(4),  NULL, "TexturesMP\\Interface\\WFlamer.tex",           50, 0,  15.0f, "XOP Flamethrower"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(6),  NULL, "TexturesMP\\Interface\\WLaser.tex",            50, 0,  15.0f, "XL2 Lasergun"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(5),  NULL, "TexturesMP\\Interface\\WSniper.tex",           15, 0,  10.0f, "RAPTOR 16mm Sniper"));
  AddWeapon(SWeaponStruct(DEF_PLACE, DEF_PLACE, DEF_WPOS, AP(7),  NULL, "TexturesMP\\Interface\\WCannon.tex",            1, 0, 700.0f, "SBC Cannon"));
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
