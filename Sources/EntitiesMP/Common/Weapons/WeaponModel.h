#pragma once

#define WM_NOCONFIG  -1
#define WM_MODELERROR 0
#define WM_MODELSET   1

// Custom weapon model
class CWeaponModel {
  public:
    CTString strConfig; // path to the model config
    BOOL bModelSet; // if model has been set

    CModelObject moModel;

    // Constructor
    CWeaponModel(void);

    // Copy constructor
    CWeaponModel(CWeaponModel &wmOther);

    // Destructor
    ~CWeaponModel(void);

    // Assignment
    CWeaponModel &operator=(CWeaponModel &wmOther);

    // Set model from a config
    INDEX SetWeaponModel(const CTString &strConfigFile);

    // Write and read weapon model
    void Write(CTStream *strm);
    void Read(CTStream *strm);
};
