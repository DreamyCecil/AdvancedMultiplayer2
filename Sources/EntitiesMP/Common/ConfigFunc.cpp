#include "StdH.h"
#include "ConfigFunc.h"

// [Cecil] Config loading function
DJSON_String LoadConfigFile(DJSON_String strFile) {
  CTFileStream strm;
  strm.Open_t(CTString(strFile.c_str()));

  // read until the end
  CTString strConfig = "";
  strConfig.ReadUntilEOF_t(strm);
  strm.Close();

  // return config
  return strConfig.str_String;
};

// [Cecil] Get entity patch config
CTString GetPatchConfig(CEntity *pen, const CTString &strType) {
  CTString strWorld = pen->GetWorld()->wo_fnmFileName.FileName();

  // get specific config
  CTString strConfigFile;
  strConfigFile.PrintF("LevelPatches\\%s\\%s_%d.json", strType, strWorld, pen->en_ulID);

  // get global config if no specific one
  if (!FileExists(strConfigFile)) {
    strConfigFile.PrintF("LevelPatches\\%s\\%s.json", strType, strWorld);

    return (FileExists(strConfigFile) ? strConfigFile : "");
  }

  // return specific config
  return strConfigFile;
};

// [Cecil] Get integer value
BOOL GetConfigInt(CConfigBlock &cb, DJSON_String strKey, INDEX &iValue) {
  INDEX iGet;
  BOOL bGot = cb.GetValue(strKey, (int &)iGet);

  if (bGot) {
    iValue = iGet;
    return TRUE;
  }
  return FALSE;
};

// [Cecil] Get float value
BOOL GetConfigFloat(CConfigBlock &cb, DJSON_String strKey, FLOAT &fValue) {
  FLOAT fGet;
  BOOL bGot = cb.GetValue(strKey, (float &)fGet);

  if (bGot) {
    fValue = fGet;
    return TRUE;
  }
  return FALSE;
};

// [Cecil] Get CTString value
BOOL GetConfigString(CConfigBlock &cb, DJSON_String strKey, CTString &strValue) {
  string strGet;
  BOOL bGot = cb.GetValue(strKey, strGet);

  if (bGot) {
    strValue = strGet.c_str();
    return TRUE;
  }
  return FALSE;
};

// [Cecil] Get CTFileName value
BOOL GetConfigPath(CConfigBlock &cb, DJSON_String strKey, CTFileName &fnValue) {
  string strGet;
  BOOL bGot = cb.GetValue(strKey, strGet);

  if (bGot) {
    fnValue = CTString(strGet.c_str());
    return TRUE;
  }
  return FALSE;
};

// [Cecil] Get 3D vector value
BOOL GetConfigVector(CConfigBlock &cb, DJSON_String strKey, FLOAT3D &vValue) {
  DJSON_Array aVector;
  BOOL bGot = cb.GetValue(strKey, aVector);

  if (bGot) {
    // copy values
    for (INDEX i = 0; i < Min(aVector.Count(), 3); i++) {
      vValue(i + 1) = aVector[i].GetNumber();
    }

    return TRUE;
  }
  return FALSE;
};

// [Cecil] Get 3D placement value
DECL_DLL BOOL GetConfigPlacement(CConfigBlock &cb, DJSON_String strKey, CPlacement3D &plValue) {
  DJSON_Array aPlace;
  BOOL bGot = cb.GetValue(strKey, aPlace);

  if (bGot) {
    // copy values
    INDEX i;

    for (i = 0; i < Min(aPlace.Count(), 3); i++) {
      plValue.pl_PositionVector((i % 3) + 1) = aPlace[i].GetNumber();
    }

    for (i = 3; i < Min(aPlace.Count(), 6); i++) {
      plValue.pl_OrientationAngle((i % 3) + 1) = aPlace[i].GetNumber();
    }

    return TRUE;
  }
  return FALSE;
};

// [Cecil] Load model from a path
BOOL SetConfigModel(CConfigBlock &cb, DJSON_String strKey, CModelObject &mo) {
  CTFileName fnPath;

  // can't get the path or the path is invalid
  if (!GetConfigPath(cb, strKey, fnPath) || !FileExists(fnPath)) {
    return FALSE;
  }

  mo.SetData_t(fnPath);
  return TRUE;
};

// [Cecil] Load texture from a path
BOOL SetConfigTexture(CConfigBlock &cb, DJSON_String strKey, CTextureObject &to) {
  CTFileName fnPath;

  // can't get the path or the path is invalid
  if (!GetConfigPath(cb, strKey, fnPath) || !FileExists(fnPath)) {
    return FALSE;
  }

  to.SetData_t(fnPath);
  return TRUE;
};
