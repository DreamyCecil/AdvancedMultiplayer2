#pragma once

// Entity class
#include "Engine/Entities/EntityClass.h"
#include "Engine/Templates/Stock_CEntityClass.h"

// ECL loader patch
class CClassStockPatch {
  public:
    CDynamicContainer<CEntityClass> st_ctObjects; // objects on stock
    CNameTable_CEntityClass st_ntObjects; // name table for fast lookup

  public:
    // Obtain an object from stock - loads if not loaded
    CEntityClass *Obtain_t(const CTFileName &fnmFileName);
};
