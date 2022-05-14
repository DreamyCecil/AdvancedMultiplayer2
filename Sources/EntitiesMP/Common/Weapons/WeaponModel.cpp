#include "StdH.h"

#include "WeaponModel.h"

// Constructor
CWeaponModel::CWeaponModel(void) {};

// Copy constructor
CWeaponModel::CWeaponModel(CWeaponModel &wmOther) {
  operator=(wmOther);
};

// Assignment
CWeaponModel &CWeaponModel::operator=(CWeaponModel &wmOther) {
  if (&wmOther == this) {
    return *this;
  }

  cbModel.CopyMap(wmOther.cbModel);
  moModel.Copy(wmOther.moModel);

  return *this;
};

// Constructor
SWeaponModelSet::SWeaponModelSet(void) : strType(""), strConfig("") {};

// Copy constructor
SWeaponModelSet::SWeaponModelSet(SWeaponModelSet &wmsOther) {
  operator=(wmsOther);
};

// Assignment
SWeaponModelSet &SWeaponModelSet::operator=(SWeaponModelSet &wmsOther) {
  if (&wmsOther == this) {
    return *this;
  }

  strType = wmsOther.strType;
  strConfig = wmsOther.strConfig;
  
  wm1 = wmsOther.wm1;
  wm2 = wmsOther.wm2;

  return *this;
};

// Clear weapon models
void SWeaponModelSet::ClearModels(void) {
  wm1.cbModel.Clear();
  wm1.moModel.SetData(NULL);

  wm2.cbModel.Clear();
  wm2.moModel.SetData(NULL);
};

// Set model from a config
BOOL SWeaponModelSet::SetWeaponModel(const CTString &strSetType, const CTString &strConfigFile) {
  strType = strSetType;

  // Remember config file
  strConfig = strConfigFile;

  // Clear previous models
  ClearModels();

  // Load models
  try {
    // Load config with two models
    CConfigBlock cbConfig;
    LoadJSON(CTString(strConfigFile), cbConfig);

    // Parse model 1
    if (!cbConfig.GetValue("Model1", wm1.cbModel)) {
      wm1.cbModel.CopyMap(cbConfig);
    }
    ParseModelConfig(wm1.cbModel, &wm1.moModel, NULL, NULL);
    
    // Parse model 2 (optional)
    if (cbConfig.GetValue("Model2", wm2.cbModel)) {
      ParseModelConfig(wm2.cbModel, &wm2.moModel, NULL, NULL);
    }
    
  // An error occrured
  } catch (char *) {
    ClearModels();
    return FALSE;
  }

  return TRUE;
};

// Check if there are any models
BOOL SWeaponModelSet::HasModels(void) {
  // Disregard second model because it can't exist without the main one
  return (wm1.moModel.GetData() != NULL);
};

// Write weapon model
void SWeaponModelSet::Write(CTStream *strm) {
  *strm << strType;
  *strm << strConfig;
};
  
// Read weapon model
void SWeaponModelSet::Read(CTStream *strm) {
  *strm >> strType;
  *strm >> strConfig;

  // reset the model
  SetWeaponModel(strType, strConfig);
};
