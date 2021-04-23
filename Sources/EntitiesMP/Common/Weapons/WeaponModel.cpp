#include "StdH.h"

#include "WeaponModel.h"

// Constructor
SWeaponModel::SWeaponModel(void) : strConfig(""), bModelSet(FALSE), pmoModel(NULL) {};

// Destructor
SWeaponModel::~SWeaponModel(void) {
  DeleteModel();
};

// Delete the model
void SWeaponModel::DeleteModel(void) {
  if (pmoModel != NULL) {
    delete pmoModel;
    pmoModel = NULL;
  }
};

// Set model from a config
INDEX SWeaponModel::SetModel(const CTString &strConfigFile) {
  // remember config file
  strConfig = strConfigFile;
  bModelSet = FALSE;

  CConfigBlock cbModel;

  // load config
  if (!LoadJSON(strConfigFile, cbModel)) {
    return WM_NOCONFIG;
  }

  // create a new model
  if (pmoModel == NULL) {
    pmoModel = new CModelObject;
  }

  // set model
  bModelSet = SetModelFromJSON(pmoModel, cbModel);

  // reset the model
  if (!bModelSet) {
    DeleteModel();
  }

  return bModelSet;
};

// Write weapon model
void SWeaponModel::Write(CTStream *strm) {
  *strm << strConfig;
};
  
// Read weapon model
void SWeaponModel::Read(CTStream *strm) {
  *strm >> strConfig;

  // reset the model
  SetModel(strConfig);
};
