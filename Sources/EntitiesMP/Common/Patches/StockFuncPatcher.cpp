#include "StdH.h"

#include "StockFuncPatcher.h"
#include "StockPatch.h"

CPatch *CStockPatcher::m_pPatch = NULL;

// Set function patches
void CStockPatcher::SetPatch(void) {
  // get function pointers
  CObtainFunc pObtain = &CStock_CEntityClass::Obtain_t;
  
  // no functions
  if (pObtain == NULL) {
    FatalError("Cannot retrieve Obtain_t function pointer!");
  }

  // obtain function
  if (m_pPatch == NULL) {
    m_pPatch = new CPatch(pObtain, &CClassStockPatch::Obtain_t, false, true);
  }

  if (!m_pPatch->ok()) {
    FatalError("Cannot set the Obtain_t patch!");
  }

  m_pPatch->set_patch();
};

// Remove function patches
void CStockPatcher::UnsetPatch(void) {
  // delete the patch
  /*m_pPatch[i]->remove_patch(true);

  delete m_pPatch;
  m_pPatch = NULL;*/
};
