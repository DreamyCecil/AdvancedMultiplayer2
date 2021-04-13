#pragma once

#include "Depends/Patcher/patcher.h"
#include "Engine/Templates/Stock_CEntityClass.h"

typedef CEntityClass *(CStock_CEntityClass::*CObtainFunc)(const CTFileName &);
typedef void (CStock_CEntityClass::*CReleaseFunc)(CEntityClass *);
typedef void (CStock_CEntityClass::*CFreeFunc)(void);

// Class stock patcher
class CStockPatcher : public CStock_CEntityClass {
  public:
    static CPatch *m_pPatch[3];

    static void SetPatch(void);
    static void UnsetPatch(void);
};
