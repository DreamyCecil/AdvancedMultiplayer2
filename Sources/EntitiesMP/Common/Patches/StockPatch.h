#pragma once

// Entity class
#include "Engine/Entities/EntityClass.h"

// ECL loader patch
class CClassStockPatch {
  public:
    // Obtain an object from stock - loads if not loaded
    CEntityClass *Obtain_t(const CTFileName &fnmFileName);

    // Release an object when not needed any more
    void Release(CEntityClass *ptObject);

    // Free all unused elements of the stock
    void FreeUnused(void);
};
