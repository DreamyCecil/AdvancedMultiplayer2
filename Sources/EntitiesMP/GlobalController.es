2003
%{
#include "StdH.h"
%}

class export CGlobalController : CRationalEntity {
name      "GlobalController";
thumbnail "";
features  "IsImportant";

properties:

components:

functions:
  // Count memory used by this object
  SLONG GetUsedMemory(void) {
    SLONG slUsedMemory = sizeof(CGlobalController) - sizeof(CRationalEntity) + CRationalEntity::GetUsedMemory();
    return slUsedMemory;
  };

procedures:
  Main() {
    InitAsVoid();
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    // travel between levels
    SetFlags(GetFlags()|ENF_CROSSESLEVELS|ENF_NOTIFYLEVELCHANGE);

    wait() {
      on (EBegin) : { resume; }

      on (EPreLevelChange) : {
        CPrintF("Bye to %s!\n", GetWorld()->GetName());
        resume;
      }

      on (EPostLevelChange) : {
        CPrintF("Hello to %s!\n", GetWorld()->GetName());
        resume;
      }

      otherwise() : { resume; }
    }

    return;
  };
};
