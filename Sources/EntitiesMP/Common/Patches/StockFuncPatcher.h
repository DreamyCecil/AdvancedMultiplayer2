#pragma once

#include "Depends/Patcher/patcher.h"
#include "Engine/Templates/Stock_CEntityClass.h"

typedef CEntityClass *(CStock_CEntityClass::*CObtainFunc)(const CTFileName &);

// Class stock patcher
class CStockPatcher : public CStock_CEntityClass {
  public:
    static CPatch *m_pPatch;

    static void SetPatch(void);
    static void UnsetPatch(void);
};
