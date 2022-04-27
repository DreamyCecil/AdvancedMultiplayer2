#pragma once

#include <map>

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
    CTString strConfig; // path to the model config
    CConfigBlock cbModel; // loaded model config

    // Constructor
    CWeaponModel(void);

    // Copy constructor
    CWeaponModel(CWeaponModel &wmOther);

    // Destructor
    ~CWeaponModel(void);

    // Assignment
    CWeaponModel &operator=(CWeaponModel &wmOther);

    // Set model from a config
    BOOL SetWeaponModel(const CTString &strConfigFile);

    // Write and read weapon model
    void Write(CTStream *strm);
    void Read(CTStream *strm);
};
