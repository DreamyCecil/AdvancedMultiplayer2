#include "StdH.h"

#include "WeaponModel.h"

// Constructor
CWeaponModel::CWeaponModel(void) : strConfig("") {};

// Copy constructor
CWeaponModel::CWeaponModel(CWeaponModel &wmOther) {
  operator=(wmOther);
};

// Destructor
CWeaponModel::~CWeaponModel(void) {

};

// Assignment
CWeaponModel &CWeaponModel::operator=(CWeaponModel &wmOther) {
  if (&wmOther == this) {
    return *this;
  }

  strConfig = wmOther.strConfig;
  cbModel.CopyMap(wmOther.cbModel);
  moModel.Copy(wmOther.moModel);

  return *this;
};

// Set model from a config
BOOL CWeaponModel::SetWeaponModel(const CTString &strConfigFile) {
  // Remember config file
  strConfig = strConfigFile;

  cbModel.Clear();
  moModel.SetData(NULL);

  // Load model
  try {
    LoadJSON(strConfigFile, cbModel);
    ParseModelConfig(cbModel, &moModel, NULL, NULL);
    
  // An error occrured
  } catch (char *) {
    cbModel.Clear();
    moModel.SetData(NULL);

    return FALSE;
  }

  return TRUE;
};

// Write weapon model
void CWeaponModel::Write(CTStream *strm) {
  *strm << strConfig;
};
  
// Read weapon model
void CWeaponModel::Read(CTStream *strm) {
  *strm >> strConfig;

  // reset the model
  SetWeaponModel(strConfig);
};
