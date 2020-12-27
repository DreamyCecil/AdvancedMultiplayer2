// [Cecil] Functions for hooking
extern void (*DJSON_pErrorFunction)(const char *);
extern void (*DJSON_pPrintFunction)(const char *);
extern DJSON_String (*DJSON_pLoadConfigFile)(DJSON_String);

// [Cecil] Config loading function
DECL_DLL DJSON_String LoadConfigFile(DJSON_String strFile);

// [Cecil] Function hooking
DECL_DLL void HookConfigFunctions(void);

// [Cecil] Get CTString value
DECL_DLL BOOL GetConfigString(CConfigBlock &cb, DJSON_String strKey, CTString &strValue);
// [Cecil] Get CTFileName value
DECL_DLL BOOL GetConfigPath(CConfigBlock &cb, DJSON_String strKey, CTFileName &fnValue);

// [Cecil] Load model from a path
DECL_DLL BOOL SetConfigModel(CConfigBlock &cb, DJSON_String strKey, CModelObject &mo);
// [Cecil] Load texture from a path
DECL_DLL BOOL SetConfigTexture(CConfigBlock &cb, DJSON_String strKey, CTextureObject &to);
