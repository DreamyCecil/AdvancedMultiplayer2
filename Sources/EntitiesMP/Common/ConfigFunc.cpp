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
  return strConfig;
};

// [Cecil] Function hooking
void HookConfigFunctions(void) {
  DJSON_pErrorFunction = (void (*)(const char *))FatalError;
  DJSON_pPrintFunction = (void (*)(const char *))CPrintF;
  DJSON_pLoadConfigFile = (DJSON_String (*)(DJSON_String))LoadConfigFile;
};

// [Cecil] Get CTString value
BOOL GetConfigString(CConfigBlock &cb, DJSON_String strKey, CTString &strValue) {
  string strGet;

  if (cb.GetValue(strKey, strGet)) {
    strValue = strGet.c_str();
    return TRUE;
  }
  return FALSE;
};

// [Cecil] Get CTFileName value
BOOL GetConfigPath(CConfigBlock &cb, DJSON_String strKey, CTFileName &fnValue) {
  string strGet;

  if (cb.GetValue(strKey, strGet)) {
    fnValue = CTString(strGet.c_str());
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
