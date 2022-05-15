#pragma once

#include <map>
#include "WeaponAnimSet.h"

#define WM_NOCONFIG  -1
#define WM_MODELERROR 0
#define WM_MODELSET   1

// Model in the attachments list
struct SListModel {
  CAttachmentModelObject *pamo;
  CModelObject *pmo;

  // Constructors
  SListModel(void) : pamo(NULL), pmo(NULL) {};
  SListModel(CAttachmentModelObject *pamoSet, CModelObject *pmoSet) : pamo(pamoSet), pmo(pmoSet) {};

  // Accessors
  inline CModelObject *operator->(void) const { return pmo; };
  inline operator CModelObject*(void) const { return pmo; };
  inline CModelObject &operator*(void) const { return *pmo; };
};

// Important attachments list
typedef std::map<string, SListModel> CAttachList;

// Custom weapon model
class CWeaponModel {
  public:
    CConfigBlock cbModel; // Loaded model config
    CModelObject moModel; // Precached and constructed model

    // Constructor
    CWeaponModel(void);

    // Copy constructor
    CWeaponModel(CWeaponModel &wmOther);

    // Assignment
    CWeaponModel &operator=(CWeaponModel &wmOther);
};

// Weapon model set
struct SWeaponModelSet {
  ULONG ulID; // Unique model set ID
  CTString strConfig; // Path to the config

  CWeaponModel wm1; // Main model  / First viewmodel
  CWeaponModel wm2; // Alt variant / Second viewmodel

  SWeaponAnimSet ans; // Animation set for these models

  // Constructor
  SWeaponModelSet(ULONG ulSetID);

  // Copy constructor
  SWeaponModelSet(SWeaponModelSet &wmsOther);

  // Assignment
  SWeaponModelSet &operator=(SWeaponModelSet &wmsOther);

  // Clear weapon models
  void ClearModels(void);

  // Set model from a config
  BOOL SetWeaponModel(const CTString &strConfigFile);

  // Check if there are any models
  BOOL HasModels(void);

  // Write and read weapon viewmodel
  void Write(CTStream *strm);
  void Read(CTStream *strm);
};
