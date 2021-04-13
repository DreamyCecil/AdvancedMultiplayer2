#include "StdH.h"

#include "StockFuncPatcher.h"
#include "StockPatch.h"

CPatch *CStockPatcher::m_pPatch[3] = {NULL, NULL, NULL};

// Set function patches
void CStockPatcher::SetPatch(void) {
  // get function pointers
  CObtainFunc pObtain = &CStock_CEntityClass::Obtain_t;
  CReleaseFunc pRelease = &CStock_CEntityClass::Release;
  CFreeFunc pFree = &CStock_CEntityClass::FreeUnused;

  CTString strPatch[3] = {"Obtain_t", "Release", "FreeUnused"};
  
  // no functions
  if (pObtain == NULL) {
    FatalError("Cannot retrieve %s function pointer!", strPatch[0]);
  }
  if (pRelease == NULL) {
    FatalError("Cannot retrieve %s function pointer!", strPatch[1]);
  }
  if (pFree == NULL) {
    FatalError("Cannot retrieve %s function pointer!", strPatch[2]);
  }

  // obtain function
  if (m_pPatch[0] == NULL) {
    m_pPatch[0] = new CPatch(pObtain, &CClassStockPatch::Obtain_t, false, false);
  }

  // release function
  if (m_pPatch[1] == NULL) {
    m_pPatch[1] = new CPatch(pRelease, &CClassStockPatch::Release, false, false);
  }

  // free function
  if (m_pPatch[2] == NULL) {
    m_pPatch[2] = new CPatch(pFree, &CClassStockPatch::FreeUnused, false, false);
  }
  
  // set patches
  for (int i = 0; i < 3; i++) {
    if (!m_pPatch[i]->ok()) {
      FatalError("Cannot set the %s patch!", strPatch[i]);
    }

    m_pPatch[i]->set_patch();
  }
};

// Remove function patches
void CStockPatcher::UnsetPatch(void) {
  // go through all patches
  for (int i = 0; i < 3; i++) {
    if (m_pPatch[i] == NULL) {
      continue;
    }

    // delete the patch
    m_pPatch[i]->remove_patch(true);

    delete m_pPatch[i];
    m_pPatch[i] = NULL;
  }
};
