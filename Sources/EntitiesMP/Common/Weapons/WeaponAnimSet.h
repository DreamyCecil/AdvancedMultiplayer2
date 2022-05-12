#pragma once

#include <map>

// Specific weapon animation
struct SWeaponAnim {
  INDEX iAnim; // Animation index
  TIME tmLength; // Animation length in seconds

  // Constructor
  SWeaponAnim(INDEX iSetAnim = 0, TIME tmSetLength = 0.0f) :
    iAnim(iSetAnim), tmLength(tmSetLength) {};
};

// List of animations under specific names
typedef std::map<string, SWeaponAnim> CWeaponAnimSet;
