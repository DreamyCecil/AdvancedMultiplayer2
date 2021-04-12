#include "StdH.h"
#include "StockPatch.h"
#include "EntitiesMP/Common/ConfigFunc.h"

// Patch config
static DJSON_Block _cbConfig;
static INDEX _ctConfigEntries = 0;

// Load the config
void LoadClassPatchConfig(CTString strWorld) {
  _cbConfig.Clear();
  _ctConfigEntries = 0;

  HookConfigFunctions();

  // get level config
  CTString strConfigFile;
  strConfigFile.PrintF("LevelPatches\\Classes\\%s.json", strWorld);

  // no config
  if (!FileExists(strConfigFile)) {
    return;
  }

  // can't parse the config
  if (ParseConfig(strConfigFile, _cbConfig) != DJSON_OK) {
    FatalError("Cannot parse class patch \"%s\"", strConfigFile);
    return;
  }

  _ctConfigEntries = _cbConfig.Count();
};

// READER FUNCTIONS

// Load DLL
HINSTANCE LoadDLL_t(const char *strFileName) {
  HINSTANCE hiDLL = ::LoadLibraryA(strFileName);

  // if the DLL can not be loaded
  if (hiDLL == NULL) {
    // get the error code
    DWORD dwMessageId = GetLastError();

    // format the windows error message
    LPVOID lpMsgBuf;
    DWORD dwSuccess = FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER|FORMAT_MESSAGE_FROM_SYSTEM, NULL, dwMessageId,
                                    MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), (LPTSTR)&lpMsgBuf, 0, NULL);

    CTString strWinError;

    // if formatting succeeds
    if (dwSuccess != 0) {
      // copy the result
      strWinError = (char*)lpMsgBuf;
      // free the windows message buffer
      LocalFree(lpMsgBuf);

    } else {
      // set our message about the failure
      CTString strError;
      strError.PrintF(TRANS("Cannot format error message!\n"
                            "Original error code: %d,\n"
                            "Formatting error code: %d.\n"), dwMessageId, GetLastError());
      strWinError = strError;
    }

    // report error
    ThrowF_t(TRANS("Cannot load DLL file '%s':\n%s"), strFileName, strWinError);
  }

  return hiDLL;
};

// ECL parsing function
void CEntityClassPatch::Read_t(CTStream *istr) {
  // read the dll filename and class name from the stream
  CTFileName fnmDLL;
  fnmDLL.ReadFromText_t(*istr, "Package: ");

  CTString strClassName;
  strClassName.ReadFromText_t(*istr, "Class: ");

  // [Cecil] Go through the replacement config
  if (_ctConfigEntries > 0) {
    CTString strLibraryName = fnmDLL.FileName().str_String;

    for (INDEX iClass = 0; iClass < _ctConfigEntries; iClass++) {
      string strReplace = _cbConfig.GetKey(iClass);
      CConfigValue valNewClass = _cbConfig.GetValue(iClass);

      if (valNewClass.cv_eType != CVT_STRING) {
        FatalError("Replacement for \"%s\" is not a string!", strReplace.c_str());
      }

      // wrong class
      if (strClassName != strReplace.c_str()) {
        continue;
      }

      string strNewClass = valNewClass.cv_strValue;

      // ignore the same classes
      if (strClassName == strNewClass.c_str() && strLibraryName == "Entities") {
        continue;
      }

      // replace the library
      fnmDLL = fnmDLL.FileDir() + CTFILENAME("Entities") + fnmDLL.FileExt();

      // replace the class
      strClassName = strNewClass.c_str();
    }
  }

  // create name of dll
  #ifndef NDEBUG
    fnmDLL = _fnmApplicationExe.FileDir() + fnmDLL.FileName() + _strModExt+"D" + fnmDLL.FileExt();
  #else
    fnmDLL = _fnmApplicationExe.FileDir() + fnmDLL.FileName() + _strModExt + fnmDLL.FileExt();
  #endif

  // load the DLL
  CTFileName fnmExpanded;
  ExpandFilePath(EFP_READ, fnmDLL, fnmExpanded);

  ec_hiClassDLL = LoadDLL_t(fnmExpanded);
  ec_fnmClassDLL = fnmDLL;

  // get the pointer to the DLL class structure
  ec_pdecDLLClass = (CDLLEntityClass*)GetProcAddress(ec_hiClassDLL, strClassName+"_DLLClass");

  // if class structure is not found
  if (ec_pdecDLLClass == NULL) {
    // free the library
    BOOL bSuccess = FreeLibrary(ec_hiClassDLL);
    ASSERT(bSuccess);

    ec_hiClassDLL = NULL;
    ec_fnmClassDLL.Clear();

    // report error
    ThrowF_t(TRANS("Class '%s' not found in entity class package file '%s'"), strClassName, fnmDLL);
  }

  // obtain all components needed by the DLL
  CTmpPrecachingNow tpn;
  ObtainComponents_t();

  // attach the DLL
  ec_pdecDLLClass->dec_OnInitClass();

  // check that the class properties have been properly declared
  CheckClassProperties();
};

// STOCK FUNCTIONS

// Class table
static CDList<string> _aClassNames;
static CDList<CEntityClass *> _aClasses;

// Obtain an object from stock - loads if not loaded
CEntityClass *CClassStockPatch::Obtain_t(const CTFileName &fnmFileName) {
  string strFile = fnmFileName.str_String;

  // find stocked object with same name
  INDEX iClass = _aClassNames.FindIndex(strFile);

  if (iClass != -1) {
    CEntityClass *pExisting = _aClasses[iClass];
  
    // mark that it is used once again
    pExisting->MarkUsed();
    return pExisting;
  }

  // create patched class
  CEntityClassPatch *ptNew = new CEntityClassPatch;
  ptNew->ser_FileName = fnmFileName;

  // add to the lists and get its index
  iClass = _aClassNames.Add(strFile);
  _aClasses.Add(ptNew);

  try {
    // load it
    ptNew->Load_t(fnmFileName);

  } catch (char *) {
    // delete the class
    _aClassNames.Delete(iClass);
    _aClasses.Delete(iClass);

    delete ptNew;
    throw;
  }

  // mark that it is used for the first time
  ptNew->MarkUsed();
  return ptNew;
};

// Release an object when not needed any more
void CClassStockPatch::Release(CEntityClass *ptObject) {
  // mark that it is used one less time
  ptObject->MarkUnused();

  // if it is not used at all any more and should be freed automatically
  if (!ptObject->IsUsed() && ptObject->IsAutoFreed()) {
    // remove it from stock
    INDEX iClass = _aClasses.FindIndex(ptObject);

    _aClassNames.Delete(iClass);
    _aClasses.Delete(iClass);

    delete ptObject;
  }
};

// Free all unused elements of the stock
void CClassStockPatch::FreeUnused(void) {
  BOOL bAnyRemoved;

  do {
    // create container of objects that should be freed
    CDList<CEntityClass *> aToFree;
    CDList<INDEX> aiTable;

    for (INDEX i = 0; i < _aClasses.Count(); i++) {
      CEntityClass *pClass = _aClasses[i];

      if (!pClass->IsUsed()) {
        aToFree.Add(pClass);
        aiTable.Add(i);
      }
    }

    bAnyRemoved = (aToFree.Count() > 0);

    // for each object that should be freed
    for (INDEX iFree = 0; iFree < aToFree.Count(); iFree++) {
      CEntityClass *pClass = aToFree[iFree];
      INDEX iTableIndex = aiTable[iFree];

      _aClassNames.Delete(iTableIndex);
      // [Cecil] NOTE: Crashes here sometimes on "Stop Game"
      _aClasses.Delete(iTableIndex);

      delete pClass;
    }

  // as long as there is something to remove
  } while (bAnyRemoved);
};
