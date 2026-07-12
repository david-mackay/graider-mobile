const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const targetDir = '/Users/davidmackay/dev/graider/graider-mobile/components';
const files = walk(targetDir);

files.forEach(file => {
  if (file.includes('marketing/LandingPage.tsx') || file.includes('marketing/VaultResumeGate.tsx') || file.includes('marketing/SocialProofCard.tsx') || file.includes('marketing/OnboardingShell.tsx')) {
    // If I want to skip some, I can. I'll just skip LandingPage and VaultResumeGate.
    if (file.includes('marketing/LandingPage.tsx') || file.includes('marketing/VaultResumeGate.tsx')) return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/<div/g, '<View');
  content = content.replace(/<\/div/g, '</View');
  
  content = content.replace(/<p/g, '<Text');
  content = content.replace(/<\/p/g, '</Text');
  
  content = content.replace(/<h[1-6]/g, '<Text');
  content = content.replace(/<\/h[1-6]/g, '</Text');
  
  content = content.replace(/<span/g, '<Text');
  content = content.replace(/<\/span/g, '</Text');
  
  content = content.replace(/<img/g, '<Image');
  content = content.replace(/<\/img/g, '</Image');
  
  content = content.replace(/<button/g, '<TouchableOpacity');
  content = content.replace(/<\/button/g, '</TouchableOpacity');
  
  content = content.replace(/<input/g, '<TextInput');
  content = content.replace(/<textarea/g, '<TextInput multiline');
  content = content.replace(/<\/textarea/g, '</TextInput');
  
  content = content.replace(/onClick={/g, 'onPress={');
  content = content.replace(/onChange={/g, 'onChangeText={');

  content = content.replace(/import Link from "next\/link";?/g, 'import { Link } from "expo-router";');
  content = content.replace(/import Image from "next\/image";?/g, 'import { Image } from "expo-image";');

  // Add RN imports
  const rnImports = `import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, Pressable } from 'react-native';\n`;
  content = rnImports + content;

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Transformation complete!');
