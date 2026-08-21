/**
 * Standard Pakistani roadside market rates & fair pricing estimation engine.
 * Provides transparent price ranges based on vehicle make, breakdown type, and service requirements.
 */

export const BREAKDOWN_PRICING_ESTIMATES = {
  'Flat Tire': {
    min: 1200,
    max: 2200,
    suggested: 1600,
    titleEn: 'Flat Tire / Puncture Repair',
    titleUr: 'پنکچر یا ٹائر کی تبدیلی',
    detailsEn: 'Includes on-site jack lift, puncture sealing, and spare tire replacement.'
  },
  'Battery Jumpstart': {
    min: 1200,
    max: 2000,
    suggested: 1500,
    titleEn: 'Battery Jumpstart / Terminal Clean',
    titleUr: 'بیٹری جمپ سٹارٹ اور کلیننگ',
    detailsEn: 'Includes heavy-duty booster cables, terminal check, and alternator charging test.'
  },
  'Fuel Delivery': {
    min: 1500,
    max: 2800,
    suggested: 2000,
    titleEn: 'Emergency Fuel Delivery',
    titleUr: 'ہنگامی پیٹرول / ڈیزل ڈیلیوری',
    detailsEn: 'Includes emergency fuel canister delivery to your exact roadside location (fuel cost separate).'
  },
  'Engine': {
    min: 2500,
    max: 4800,
    suggested: 3500,
    titleEn: 'Engine Overheating / Radiator Flush',
    titleUr: 'انجن کی گرمائش یا ریڈی ایٹر کی خرابی',
    detailsEn: 'Includes coolant top-up, fan belt check, hose inspection, and diagnostic scan.'
  },
  'Brakes': {
    min: 2500,
    max: 5000,
    suggested: 3500,
    titleEn: 'Brake Lock / Pad Inspection',
    titleUr: 'بریک جام یا پیڈ کی خرابی',
    detailsEn: 'Includes brake fluid check, caliper release, and hydraulic line safety inspection.'
  },
  'Lockout / Key Assistance': {
    min: 1800,
    max: 3200,
    suggested: 2200,
    titleEn: 'Car Lockout & Key Assistance',
    titleUr: 'گاڑی لاک ہونا / چابی گم ہونا',
    detailsEn: 'Includes non-destructive pneumatic door wedge entry by authorized locksmith.'
  },
  'Towing': {
    min: 5000,
    max: 9500,
    suggested: 6500,
    titleEn: 'Hydraulic Flatbed Towing Service',
    titleUr: 'ہائیڈرولک ٹوئنگ سروس',
    detailsEn: 'Includes flatbed recovery truck dispatch and safe transit to your designated 3S/workshop.'
  },
  'Other Mechanical': {
    min: 2000,
    max: 4500,
    suggested: 3000,
    titleEn: 'General Mechanical Diagnostics',
    titleUr: 'جنرل مکینیکل معائنہ',
    detailsEn: 'Includes on-site OBD-II scanner diagnostics and fault resolution.'
  },
  'Accident Recovery': {
    min: 7000,
    max: 13000,
    suggested: 8500,
    titleEn: 'Accident Collision & Heavy Recovery',
    titleUr: 'حادثاتی گاڑی کی ریکوری اور ٹوئنگ',
    detailsEn: 'Includes heavy recovery winching, damage assessment, and flatbed transport to 3S body shop.'
  }
};

/**
 * Calculate recommended price range and suggested fare
 */
export function getEstimatedPriceRange(breakdownType, serviceType, vehicleMake = 'Toyota', isAccident = false) {
  if (isAccident) {
    return BREAKDOWN_PRICING_ESTIMATES['Accident Recovery'];
  }

  if (serviceType === 'Towing') {
    return BREAKDOWN_PRICING_ESTIMATES['Towing'];
  }

  // Match breakdown type key
  let baseKey = 'Other Mechanical';
  if (breakdownType?.includes('Tire')) baseKey = 'Flat Tire';
  else if (breakdownType?.includes('Battery')) baseKey = 'Battery Jumpstart';
  else if (breakdownType?.includes('Fuel')) baseKey = 'Fuel Delivery';
  else if (breakdownType?.includes('Engine')) baseKey = 'Engine';
  else if (breakdownType?.includes('Brake')) baseKey = 'Brakes';
  else if (breakdownType?.includes('Lockout')) baseKey = 'Lockout / Key Assistance';

  const base = BREAKDOWN_PRICING_ESTIMATES[baseKey] || BREAKDOWN_PRICING_ESTIMATES['Other Mechanical'];

  // Luxury / European vehicle premium adjustment
  let multiplier = 1.0;
  const luxuryMakes = ['BMW', 'Audi', 'Mercedes', 'Mercedes-Benz', 'Porsche', 'Land Rover'];
  if (luxuryMakes.includes(vehicleMake)) {
    multiplier = 1.35;
  }

  return {
    ...base,
    min: Math.round(base.min * multiplier),
    max: Math.round(base.max * multiplier),
    suggested: Math.round(base.suggested * multiplier)
  };
}
