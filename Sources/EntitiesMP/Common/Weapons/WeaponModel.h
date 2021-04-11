#pragma once

#define WM_NOCONFIG  -1
#define WM_MODELERROR 0
#define WM_MODELSET   1

// Custom weapon model
struct SWeaponModel {
  CTString strConfig; // path to the model config
  BOOL bModelSet; // if model has been set

  CModelObject *pmoModel;

  // Constructor
  SWeaponModel(void);

  // Destructor
  ~SWeaponModel(void);

  // Delete the model
  void DeleteModel(void);

  // Set model from a config
  INDEX SetModel(const CTString &strConfigFile);

  // Write and read weapon model
  void Write(CTStream *strm);
  void Read(CTStream *strm);
};
