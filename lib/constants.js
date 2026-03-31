export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export const RESOURCE_TYPES = [
  "Blood",
  "Oxygen Cylinder",
  "Ventilator",
  "ICU Bed",
  "Ambulance",
  "Wheelchair",
  "Nebulizer",
  "First Aid Kit",
];

export const SEARCH_RESOURCE_TYPES = ["All", ...RESOURCE_TYPES];

export const BLOOD_DONOR_TYPES = ["Individual", "Blood Bank", "Hospital", "Clinic"];

export const RESOURCE_PROVIDER_TYPES = [
  "Emergency Supplier",
  "Hospital",
  "Clinic",
  "Medical Store",
  "NGO",
  "Individual",
];

export const DONOR_TYPES = Array.from(new Set([...BLOOD_DONOR_TYPES, ...RESOURCE_PROVIDER_TYPES]));
export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
