#include "StdH.h"

#include "WeaponModel.h"

// Constructor
CWeaponModel::CWeaponModel(void) : strConfig(""), bModelSet(FALSE) {};

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
  SetWeaponModel(strConfig);

  return *this;
};

// Set model from a config
INDEX CWeaponModel::SetWeaponModel(const CTString &strConfigFile) {
  // remember config file
  strConfig = strConfigFile;
  bModelSet = FALSE;

  CConfigBlock cbModel;

  // load config
  if (LoadJSON(strConfigFile, cbModel) != DJSON_OK) {
    return WM_NOCONFIG;
  }

  // set model
  try {
    ParseModelConfig(cbModel, &moModel, NULL);

  } catch (char *strError) {
    FatalError(strError);
    return WM_MODELERROR;
  }

  bModelSet = TRUE;
  return WM_MODELSET;
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
