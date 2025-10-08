// Contact Information Detection Utility
// Detects phone numbers, emails, addresses, and social media handles

/**
 * Detects contact information in text
 * @param {string} text - Text to analyze
 * @returns {Object} { detected: boolean, violations: Array, message: string }
 */
export const detectContactInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return { detected: false, violations: [], message: '' };
  }

  const violations = [];

  // ========================================
  // 1. PHONE NUMBER DETECTION
  // ========================================
  
  // UK phone numbers - various formats
  const phonePatterns = [
    // Standard formats: 07912345678, 0791 234 5678, 0791-234-5678
    /\b0\d{10}\b/g,
    /\b0\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g,
    /\b0\d{4}[\s-]?\d{6}\b/g,
    
    // International: +44 7912345678, +447912345678, 00447912345678
    /\+44[\s-]?7\d{9}\b/g,
    /\+44[\s-]?\d{10}\b/g,
    /\b0044[\s-]?\d{10}\b/g,
    
    // With parentheses: (0791) 234 5678
    /\(\d{4}\)[\s-]?\d{3}[\s-]?\d{4}\b/g,
    
    // Landlines: 020 1234 5678, 0161 123 4567
    /\b0[1-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}\b/g
  ];

  // Written out numbers: "zero seven nine one two..."
  const writtenNumbers = /\b(zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s-]?(zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s-]?(zero|one|two|three|four|five|six|seven|eight|nine|oh)/gi;
  
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        violations.push({
          type: 'phone',
          value: match,
          message: 'Phone number detected'
        });
      });
    }
  });

  if (writtenNumbers.test(text)) {
    violations.push({
      type: 'phone',
      value: 'written number',
      message: 'Written phone number detected'
    });
  }

  // "Call me" variations
  const callPhrases = /(call|ring|phone|text|message|mobile|number)\s+(me|on|at|is)/gi;
  if (callPhrases.test(text)) {
    violations.push({
      type: 'phone',
      value: 'call phrase',
      message: 'Request for phone contact detected'
    });
  }

  // ========================================
  // 2. EMAIL DETECTION
  // ========================================
  
  // Standard email: user@domain.com
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailPattern);
  if (emailMatches) {
    emailMatches.forEach(match => {
      violations.push({
        type: 'email',
        value: match,
        message: 'Email address detected'
      });
    });
  }

  // Obfuscated emails: "john at gmail dot com", "user[at]domain.com"
  const obfuscatedEmail = /([\w.-]+)\s*(at|@|\[at\])\s*([\w.-]+)\s*(dot|\.|\[dot\])\s*(com|co\.uk|org|net)/gi;
  if (obfuscatedEmail.test(text)) {
    violations.push({
      type: 'email',
      value: 'obfuscated email',
      message: 'Obfuscated email address detected'
    });
  }

  // "Email me" variations
  const emailPhrases = /(email|e-mail|mail|contact)\s+(me|at|is)/gi;
  if (emailPhrases.test(text)) {
    violations.push({
      type: 'email',
      value: 'email phrase',
      message: 'Request for email contact detected'
    });
  }

  // ========================================
  // 3. ADDRESS DETECTION
  // ========================================
  
  // UK Postcodes: SW1A 1AA, M1 1AA, etc.
  const postcodePattern = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/gi;
  const postcodeMatches = text.match(postcodePattern);
  if (postcodeMatches) {
    postcodeMatches.forEach(match => {
      violations.push({
        type: 'address',
        value: match,
        message: 'Postcode detected'
      });
    });
  }

  // Street addresses: "123 Main Street", "45 High Road"
  const streetPattern = /\b\d{1,5}\s+[A-Za-z]{2,}(\s+[A-Za-z]+){0,3}\s+(Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Close|Cl|Way|Court|Ct|Place|Pl)\b/gi;
  const streetMatches = text.match(streetPattern);
  if (streetMatches) {
    streetMatches.forEach(match => {
      violations.push({
        type: 'address',
        value: match,
        message: 'Street address detected'
      });
    });
  }

  // Address phrases
  const addressPhrases = /(I live at|my address is|come to|meet me at)\s+\d/gi;
  if (addressPhrases.test(text)) {
    violations.push({
      type: 'address',
      value: 'address phrase',
      message: 'Address reference detected'
    });
  }

  // ========================================
  // 4. SOCIAL MEDIA DETECTION
  // ========================================
  
  // WhatsApp
  const whatsappPattern = /(whatsapp|whats app|wa me|message me on wa)/gi;
  if (whatsappPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'WhatsApp',
      message: 'WhatsApp reference detected'
    });
  }

  // Facebook
  const facebookPattern = /(facebook|fb\.com|find me on fb|add me on facebook)/gi;
  if (facebookPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'Facebook',
      message: 'Facebook reference detected'
    });
  }

  // Instagram
  const instagramPattern = /(instagram|insta|ig:|find me on insta)/gi;
  if (instagramPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'Instagram',
      message: 'Instagram reference detected'
    });
  }

  // Twitter/X
  const twitterPattern = /(twitter|tweet|x\.com|@\w+)/gi;
  if (twitterPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'Twitter/X',
      message: 'Twitter/X reference detected'
    });
  }

  // LinkedIn
  const linkedinPattern = /(linkedin|linked in|connect with me on)/gi;
  if (linkedinPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'LinkedIn',
      message: 'LinkedIn reference detected'
    });
  }

  // Snapchat
  const snapchatPattern = /(snapchat|snap me|add me on snap)/gi;
  if (snapchatPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'Snapchat',
      message: 'Snapchat reference detected'
    });
  }

  // TikTok
  const tiktokPattern = /(tiktok|tik tok)/gi;
  if (tiktokPattern.test(text)) {
    violations.push({
      type: 'social',
      value: 'TikTok',
      message: 'TikTok reference detected'
    });
  }

  // ========================================
  // 5. GENERIC CONTACT REQUESTS
  // ========================================
  
  const genericContact = /(contact me directly|reach me at|get in touch outside|bypass|off platform|outside the app)/gi;
  if (genericContact.test(text)) {
    violations.push({
      type: 'generic',
      value: 'direct contact request',
      message: 'Request for off-platform contact detected'
    });
  }

  // ========================================
  // RETURN RESULTS
  // ========================================
  
  const detected = violations.length > 0;
  
  let message = '';
  if (detected) {
    const types = [...new Set(violations.map(v => v.type))];
    const typeNames = types.map(type => {
      switch(type) {
        case 'phone': return 'phone number';
        case 'email': return 'email address';
        case 'address': return 'address';
        case 'social': return 'social media';
        case 'generic': return 'direct contact request';
        default: return 'contact information';
      }
    });
    
    if (typeNames.length === 1) {
      message = `${typeNames[0]} detected`;
    } else if (typeNames.length === 2) {
      message = `${typeNames[0]} and ${typeNames[1]} detected`;
    } else {
      message = `${typeNames.slice(0, -1).join(', ')}, and ${typeNames[typeNames.length - 1]} detected`;
    }
  }

  return {
    detected,
    violations,
    message
  };
};

/**
 * Generate user-friendly warning message
 * @param {number} violationCount - Current violation count (0, 1, 2, 3+)
 * @returns {string} Warning message
 */
export const getViolationWarning = (violationCount) => {
  switch(violationCount) {
    case 0:
      return `⚠️ Contact Information Detected

For your safety and to maintain platform integrity, sharing contact details before booking is not allowed.

Please wait until the job is active to exchange personal information.`;

    case 1:
      return `⚠️ Second Violation Warning

This is your SECOND attempt to share contact information.

One more violation will result in account suspension.

Please use the platform's communication tools until the job is confirmed.`;

    case 2:
      return `🚫 FINAL WARNING - Account Will Be Suspended

This is your THIRD violation attempt.

Your account has been SUSPENDED for repeatedly attempting to bypass platform policies.

Please contact support@patchworktrades.com to appeal this decision.`;

    default:
      return `🚫 Account Suspended

Your account has been suspended for policy violations.

Contact support@patchworktrades.com to appeal.`;
  }
};

/**
 * Get shortened warning for UI display
 * @param {number} violationCount 
 * @returns {string}
 */
export const getShortWarning = (violationCount) => {
  switch(violationCount) {
    case 0:
      return "Contact info not allowed before booking. Please remove it.";
    case 1:
      return "⚠️ Warning 2/3: One more violation will suspend your account.";
    case 2:
      return "🚫 Account suspended. Contact support@patchworktrades.com";
    default:
      return "🚫 Account suspended.";
  }
};

export default detectContactInfo;
