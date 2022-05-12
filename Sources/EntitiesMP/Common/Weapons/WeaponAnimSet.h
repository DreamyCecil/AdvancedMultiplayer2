#pragma once

#include <map>

// Specific weapon animation
struct SWeaponAnim {
  CStaticArray<INDEX> aiAnims; // Animation indices
  CStaticArray<TIME> atmLengths; // Animation lengths in seconds
  
  // Default constructor
  SWeaponAnim(void) {};

  // Constructor with one animation
  SWeaponAnim(INDEX iSetAnim, TIME tmSetLength) {
    aiAnims.New(1);
    atmLengths.New(1);

    aiAnims[0] = iSetAnim;
    atmLengths[0] = tmSetLength;
  };
};

// List of animations under specific names
typedef std::map<string, SWeaponAnim> CWeaponAnims;

// Set of weapon animations under a certain name
struct SWeaponAnimSet {
  string strName;
  CWeaponAnims mapAnims;

  // Constructor
  SWeaponAnimSet(void) : strName("") {};
};
