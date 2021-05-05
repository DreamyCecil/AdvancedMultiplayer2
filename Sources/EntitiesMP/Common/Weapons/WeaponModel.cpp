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

  return *this;
};

// Set model from a config
BOOL CWeaponModel::SetWeaponModel(const CTString &strConfigFile) {
  // remember config file
  strConfig = strConfigFile;
  cbModel.Clear();

  // load config
  if (LoadJSON(strConfigFile, cbModel) != DJSON_OK) {
    cbModel.Clear();
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
