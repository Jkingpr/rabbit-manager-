import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Rabbit {
  id: number;
  name: string;
  left_ear_tattoo?: string;
  breed?: string;
  sex: string;
  birth_date?: string;
  weight_kg?: number;
  weight?: number;
  status?: string;
  parent_male_name?: string;
  parent_female_name?: string;
  parent_male_id?: number;
  parent_female_id?: number;
  notes?: string;
  photo_url?: string;
}

interface Breeding {
  id: number;
  male_id: number;
  female_id: number;
  breeding_date: string;
  expected_birth_date?: string;
  male_name?: string;
  female_name?: string;
  male_ear_tag?: string;
  female_ear_tag?: string;
  status?: string;
  notes?: string;
}

interface UserInfo {
  name?: string;
  ranch_name?: string;
  location?: string;
  phone?: string;
  email?: string;
}

interface AncestorRabbit {
  id: number;
  name: string;
  left_ear_tattoo?: string;
  sex: string;
  breed?: string;
  weight?: number;
  birth_date?: string;
  parent_male_id?: number;
  parent_female_id?: number;
}

// Fetch user info from API
async function getUserInfo(): Promise<UserInfo> {
  try {
    const response = await fetch('/api/users/profile');
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.name,
        ranch_name: data.ranch_name,
        location: data.location,
        phone: data.phone,
        email: data.email
      };
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }
  return {};
}

// Fetch ancestor data for genealogy tree
async function fetchAncestor(id: number): Promise<AncestorRabbit | null> {
  try {
    const response = await fetch(`/api/rabbits/${id}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching ancestor:', error);
  }
  return null;
}

// Build complete genealogy tree (3 generations back)
async function buildGenealogyTree(rabbit: Rabbit) {
  const tree: any = {
    subject: rabbit,
    father: null,
    mother: null,
    paternalGrandfather: null,
    paternalGrandmother: null,
    maternalGrandfather: null,
    maternalGrandmother: null,
    paternalGreatGrandparents: { father: null, mother: null, father2: null, mother2: null },
    maternalGreatGrandparents: { father: null, mother: null, father2: null, mother2: null }
  };

  // Fetch parents
  if (rabbit.parent_male_id) {
    tree.father = await fetchAncestor(rabbit.parent_male_id);
    
    // Fetch paternal grandparents
    if (tree.father) {
      if (tree.father.parent_male_id) {
        tree.paternalGrandfather = await fetchAncestor(tree.father.parent_male_id);
        
        // Fetch paternal great-grandparents (father's father's parents)
        if (tree.paternalGrandfather) {
          if (tree.paternalGrandfather.parent_male_id) {
            tree.paternalGreatGrandparents.father = await fetchAncestor(tree.paternalGrandfather.parent_male_id);
          }
          if (tree.paternalGrandfather.parent_female_id) {
            tree.paternalGreatGrandparents.mother = await fetchAncestor(tree.paternalGrandfather.parent_female_id);
          }
        }
      }
      if (tree.father.parent_female_id) {
        tree.paternalGrandmother = await fetchAncestor(tree.father.parent_female_id);
        
        // Fetch paternal great-grandparents (father's mother's parents)
        if (tree.paternalGrandmother) {
          if (tree.paternalGrandmother.parent_male_id) {
            tree.paternalGreatGrandparents.father2 = await fetchAncestor(tree.paternalGrandmother.parent_male_id);
          }
          if (tree.paternalGrandmother.parent_female_id) {
            tree.paternalGreatGrandparents.mother2 = await fetchAncestor(tree.paternalGrandmother.parent_female_id);
          }
        }
      }
    }
  }

  if (rabbit.parent_female_id) {
    tree.mother = await fetchAncestor(rabbit.parent_female_id);
    
    // Fetch maternal grandparents
    if (tree.mother) {
      if (tree.mother.parent_male_id) {
        tree.maternalGrandfather = await fetchAncestor(tree.mother.parent_male_id);
        
        // Fetch maternal great-grandparents (mother's father's parents)
        if (tree.maternalGrandfather) {
          if (tree.maternalGrandfather.parent_male_id) {
            tree.maternalGreatGrandparents.father = await fetchAncestor(tree.maternalGrandfather.parent_male_id);
          }
          if (tree.maternalGrandfather.parent_female_id) {
            tree.maternalGreatGrandparents.mother = await fetchAncestor(tree.maternalGrandfather.parent_female_id);
          }
        }
      }
      if (tree.mother.parent_female_id) {
        tree.maternalGrandmother = await fetchAncestor(tree.mother.parent_female_id);
        
        // Fetch maternal great-grandparents (mother's mother's parents)
        if (tree.maternalGrandmother) {
          if (tree.maternalGrandmother.parent_male_id) {
            tree.maternalGreatGrandparents.father2 = await fetchAncestor(tree.maternalGrandmother.parent_male_id);
          }
          if (tree.maternalGrandmother.parent_female_id) {
            tree.maternalGreatGrandparents.mother2 = await fetchAncestor(tree.maternalGrandmother.parent_female_id);
          }
        }
      }
    }
  }

  return tree;
}

// Draw a rabbit info box in the pedigree tree
function drawRabbitBox(doc: jsPDF, rabbit: AncestorRabbit | null, x: number, y: number, width: number, height: number) {
  if (!rabbit) {
    // Draw empty box
    doc.setFillColor(245, 245, 245);
    doc.rect(x, y, width, height, 'FD');
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, width, height, 'S');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Desconocido', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }

  // Color based on sex
  if (rabbit.sex === 'male') {
    doc.setFillColor(173, 216, 230); // Light blue
    doc.setDrawColor(100, 149, 237); // Cornflower blue
  } else {
    doc.setFillColor(255, 182, 193); // Light pink
    doc.setDrawColor(255, 105, 180); // Hot pink
  }

  doc.rect(x, y, width, height, 'FD');
  
  // Text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  const name = rabbit.name || 'Sin nombre';
  const nameLines = doc.splitTextToSize(name, width - 4);
  doc.text(nameLines, x + 2, y + 3);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  let textY = y + 3 + (nameLines.length * 2.5);
  
  if (rabbit.left_ear_tattoo) {
    doc.text(`ID: ${rabbit.left_ear_tattoo}`, x + 2, textY);
    textY += 2.5;
  }
  
  if (rabbit.breed) {
    const breedText = doc.splitTextToSize(`Raza: ${rabbit.breed}`, width - 4);
    doc.text(breedText, x + 2, textY);
    textY += breedText.length * 2.5;
  }
  
  if (rabbit.weight) {
    const weightLb = (rabbit.weight * 2.20462).toFixed(1);
    doc.text(`Peso: ${weightLb} lb`, x + 2, textY);
    textY += 2.5;
  }
  
  if (rabbit.birth_date) {
    const birthDate = new Date(rabbit.birth_date).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
    doc.text(`Nac: ${birthDate}`, x + 2, textY);
  }
}

export async function exportRabbitPDF(rabbit: Rabbit) {
  const doc = new jsPDF('landscape', 'mm', 'letter'); // Landscape for pedigree tree
  const userInfo = await getUserInfo();
  const genealogyTree = await buildGenealogyTree(rabbit);
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19); // Brown color
  doc.text('PedigreeCunicontrol™', 10, 10);
  
  // Subject rabbit photo and info (top left)
  let photoY = 15;
  
  // Photo placeholder (if photo exists, we'd load it here)
  if (rabbit.photo_url) {
    // Draw placeholder box first
    doc.setFillColor(240, 240, 240);
    doc.rect(10, photoY, 35, 35, 'F');
    doc.setDrawColor(150, 150, 150);
    doc.rect(10, photoY, 35, 35, 'S');
    
    // Try to load and draw the photo with proper orientation
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Create canvas to properly orient the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            
            // Set canvas size to match photo box (square)
            const size = 300; // Higher resolution for better quality
            canvas.width = size;
            canvas.height = size;
            
            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            
            // Calculate dimensions to fit image in square (cover mode)
            const scale = Math.max(size / img.width, size / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (size - scaledWidth) / 2;
            const y = (size - scaledHeight) / 2;
            
            // Draw image centered and covering the square
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            // Add to PDF
            doc.addImage(dataUrl, 'JPEG', 10, photoY, 35, 35);
            resolve(true);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
        
        // Add full URL if it's a relative path
        const photoUrl = rabbit.photo_url!.startsWith('http') 
          ? rabbit.photo_url! 
          : window.location.origin + rabbit.photo_url!;
        img.src = photoUrl;
        
        // Timeout after 3 seconds
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
    } catch (error) {
      console.log('Could not load photo, using placeholder:', error);
    }
  } else {
    doc.setFillColor(240, 240, 240);
    doc.rect(10, photoY, 35, 35, 'F');
    doc.setDrawColor(150, 150, 150);
    doc.rect(10, photoY, 35, 35, 'S');
  }
  
  // Subject info below photo
  let infoY = photoY + 37;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Sexo:', 10, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(rabbit.sex === 'male' ? 'Macho' : 'Hembra', 22, infoY);
  
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ID:', 10, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(rabbit.left_ear_tattoo || 'Sin ID', 22, infoY);
  
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', 10, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), 22, infoY);
  
  // Breed info
  infoY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Raza:', 10, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(rabbit.breed || 'Desconocida', 22, infoY);
  
  // Owner info box (top right)
  const ownerBoxX = 225;
  const ownerBoxY = 15;
  doc.setDrawColor(100, 100, 100);
  doc.rect(ownerBoxX, ownerBoxY, 45, 25, 'S');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let ownerY = ownerBoxY + 4;
  doc.text('Criador:', ownerBoxX + 2, ownerY);
  
  doc.setFont('helvetica', 'normal');
  ownerY += 3.5;
  if (userInfo.ranch_name) {
    doc.text(userInfo.ranch_name, ownerBoxX + 2, ownerY);
    ownerY += 3.5;
  }
  if (userInfo.name) {
    doc.text(userInfo.name, ownerBoxX + 2, ownerY);
    ownerY += 3.5;
  }
  if (userInfo.location) {
    doc.text(userInfo.location, ownerBoxX + 2, ownerY);
    ownerY += 3.5;
  }
  if (userInfo.phone) {
    doc.text(userInfo.phone, ownerBoxX + 2, ownerY);
  }
  
  // GENEALOGY TREE
  const treeStartX = 50;
  const treeStartY = 15;
  const boxWidth = 42;
  const boxHeight = 22;
  const horizontalGap = 2;
  const verticalGap = 3;
  
  // Subject's parent (Level 1 - Father)
  const fatherX = treeStartX;
  const fatherY = treeStartY;
  drawRabbitBox(doc, genealogyTree.father, fatherX, fatherY, boxWidth, boxHeight);
  
  // Grandparents (Level 2 - Father's parents)
  const grandparentX = fatherX + boxWidth + horizontalGap;
  drawRabbitBox(doc, genealogyTree.paternalGrandfather, grandparentX, fatherY, boxWidth, boxHeight);
  
  const grandmotherY = fatherY + boxHeight + verticalGap;
  drawRabbitBox(doc, genealogyTree.paternalGrandmother, grandparentX, grandmotherY, boxWidth, boxHeight);
  
  // Great-grandparents (Level 3 - Father's father's parents)
  const greatGrandX = grandparentX + boxWidth + horizontalGap;
  drawRabbitBox(doc, genealogyTree.paternalGreatGrandparents.father, greatGrandX, fatherY, boxWidth, boxHeight);
  
  const ggMotherY = fatherY + boxHeight + verticalGap;
  drawRabbitBox(doc, genealogyTree.paternalGreatGrandparents.mother, greatGrandX, ggMotherY, boxWidth, boxHeight);
  
  // Great-grandparents (Father's mother's parents)
  const gg2Y = grandmotherY + boxHeight + verticalGap;
  drawRabbitBox(doc, genealogyTree.paternalGreatGrandparents.father2, greatGrandX, grandmotherY, boxWidth, boxHeight);
  
  drawRabbitBox(doc, genealogyTree.paternalGreatGrandparents.mother2, greatGrandX, gg2Y, boxWidth, boxHeight);
  
  // Subject's parent (Level 1 - Mother)
  const motherY = fatherY + (boxHeight * 2) + (verticalGap * 2) + 6;
  drawRabbitBox(doc, genealogyTree.mother, fatherX, motherY, boxWidth, boxHeight);
  
  // Grandparents (Level 2 - Mother's parents)
  drawRabbitBox(doc, genealogyTree.maternalGrandfather, grandparentX, motherY, boxWidth, boxHeight);
  
  const maternalGrandmotherY = motherY + boxHeight + verticalGap;
  drawRabbitBox(doc, genealogyTree.maternalGrandmother, grandparentX, maternalGrandmotherY, boxWidth, boxHeight);
  
  // Great-grandparents (Level 3 - Mother's father's parents)
  drawRabbitBox(doc, genealogyTree.maternalGreatGrandparents.father, greatGrandX, motherY, boxWidth, boxHeight);
  
  const mgMotherY = motherY + boxHeight + verticalGap;
  drawRabbitBox(doc, genealogyTree.maternalGreatGrandparents.mother, greatGrandX, mgMotherY, boxWidth, boxHeight);
  
  // Great-grandparents (Mother's mother's parents)
  const mg2Y = maternalGrandmotherY + boxHeight + verticalGap;
  drawRabbitBox(doc, genealogyTree.maternalGreatGrandparents.father2, greatGrandX, maternalGrandmotherY, boxWidth, boxHeight);
  
  drawRabbitBox(doc, genealogyTree.maternalGreatGrandparents.mother2, greatGrandX, mg2Y, boxWidth, boxHeight);
  
  // Central title for rabbit
  const centerY = 100;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(rabbit.name || 'Sin nombre', 25, centerY);
  
  // Breeder info at bottom
  const bottomY = 185;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Este pedigree certifica la línea genealógica del conejo mencionado. El criador certifica que:', 10, bottomY);
  doc.text('la información es correcta según su conocimiento.', 10, bottomY + 3.5);
  
  doc.setFont('helvetica', 'italic');
  doc.text('Copyright © 2025 Cunicontrol. Todos los derechos reservados.', 10, bottomY + 10);
  doc.text('Pedigree generado por www.cunicontrol.com', 10, bottomY + 14);
  
  // Signature line
  doc.line(10, bottomY + 25, 80, bottomY + 25);
  doc.setFontSize(7);
  doc.text('Certifico que este pedigree es correcto según mi conocimiento.  Firmado: ________________  Fecha: ________________', 10, bottomY + 29);
  
  // Save
  const filename = rabbit.left_ear_tattoo 
    ? `pedigree-${rabbit.left_ear_tattoo}.pdf`
    : `pedigree-${rabbit.name || rabbit.id}.pdf`;
  doc.save(filename);
}

export async function exportBreedingPDF(breeding: Breeding) {
  const doc = new jsPDF();
  const userInfo = await getUserInfo();
  
  // Modern header with gradient effect
  doc.setFillColor(219, 39, 119); // Pink-600
  doc.rect(0, 0, 210, 45, 'F');
  
  // Logo/Icon area
  doc.setFillColor(255, 255, 255);
  doc.circle(20, 20, 8, 'F');
  doc.setFillColor(219, 39, 119);
  doc.circle(20, 20, 6, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRO DE CRUCE', 35, 18);
  
  // Ranch/Owner info in header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let headerY = 28;
  if (userInfo.ranch_name) {
    doc.text(`${userInfo.ranch_name}`, 35, headerY);
    headerY += 5;
  } else if (userInfo.name) {
    doc.text(`Propietario: ${userInfo.name}`, 35, headerY);
    headerY += 5;
  }
  if (userInfo.location) {
    doc.text(`${userInfo.location}`, 35, headerY);
  }
  
  // Date in header
  doc.setFontSize(9);
  doc.text(`${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, 35, 39);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Breeding identification section
  let y = 58;
  doc.setFillColor(249, 250, 251);
  doc.rect(14, y - 8, 182, 18, 'F');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(`${breeding.male_name || 'Macho'} × ${breeding.female_name || 'Hembra'}`, 18, y);
  
  if (breeding.male_ear_tag || breeding.female_ear_tag) {
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${breeding.male_ear_tag || '-'} × ${breeding.female_ear_tag || '-'}`, 18, y + 8);
  }
  
  // Reset
  doc.setTextColor(0, 0, 0);
  y += 25;
  
  // Details
  const breedingDate = new Date(breeding.breeding_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const expectedDate = breeding.expected_birth_date 
    ? new Date(breeding.expected_birth_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  
  let status = breeding.status || 'Pendiente';
  let daysInfo = '';
  if (breeding.expected_birth_date) {
    const daysUntilBirth = Math.ceil((new Date(breeding.expected_birth_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilBirth > 0) {
      daysInfo = `${daysUntilBirth} días restantes`;
    } else if (daysUntilBirth === 0) {
      daysInfo = 'Hoy';
    } else {
      daysInfo = 'Vencido';
    }
  }
  
  const info = [
    ['Macho', breeding.male_name || `ID ${breeding.male_id}`],
    ['Hembra', breeding.female_name || `ID ${breeding.female_id}`],
    ['Fecha de Cruce', breedingDate],
    ['Parto Esperado', expectedDate],
    ['Estado', status],
  ];
  
  if (daysInfo) {
    info.push(['Días Restantes', daysInfo]);
  }
  
  autoTable(doc, {
    body: info,
    startY: y,
    theme: 'grid',
    styles: {
      fontSize: 11,
      cellPadding: 5,
      lineColor: [229, 231, 235],
      lineWidth: 0.5
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        cellWidth: 65,
        fillColor: [243, 244, 246],
        textColor: [55, 65, 81]
      },
      1: { 
        cellWidth: 'auto',
        textColor: [31, 41, 55]
      }
    }
  });
  
  // Notes section
  if (breeding.notes) {
    const finalY = (doc as any).lastAutoTable.finalY || y;
    y = finalY + 12;
    
    doc.setFillColor(219, 39, 119);
    doc.rect(14, y - 3, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTAS ADICIONALES', 18, y + 2);
    
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(breeding.notes, 175);
    doc.text(splitNotes, 18, y + 12);
  }
  
  // Professional footer
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 287, 210, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Cunicontrol - Sistema Profesional de Gestión Cunícola', 105, 292, { align: 'center' });
  
  // Save
  const filename = `cruce-${breeding.id}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function exportRabbitsToPDF(rabbits: Rabbit[]) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Reporte de Conejos', 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);
  
  // Table data
  const tableData = rabbits.map(rabbit => {
    const age = rabbit.birth_date 
      ? Math.floor((new Date().getTime() - new Date(rabbit.birth_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const weight = rabbit.weight_kg || rabbit.weight;
    const weightLb = weight ? (weight * 2.20462).toFixed(1) : '-';
    
    return [
      rabbit.name || '-',
      rabbit.left_ear_tattoo || '-',
      rabbit.breed || '-',
      rabbit.sex === 'male' ? 'Macho' : 'Hembra',
      rabbit.birth_date ? new Date(rabbit.birth_date).toLocaleDateString('es-ES') : '-',
      age > 0 ? `${age} días` : '-',
      weightLb !== '-' ? `${weightLb} lb` : '-',
      rabbit.status || 'Activo'
    ];
  });
  
  // Generate table
  autoTable(doc, {
    head: [['Nombre', 'ID', 'Raza', 'Sexo', 'Nacimiento', 'Edad', 'Peso', 'Estado']],
    body: tableData,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255
    }
  });
  
  // Summary
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(10);
  doc.text(`Total de conejos: ${rabbits.length}`, 14, finalY + 10);
  
  const males = rabbits.filter(r => r.sex === 'male').length;
  const females = rabbits.filter(r => r.sex === 'female').length;
  doc.text(`Machos: ${males} | Hembras: ${females}`, 14, finalY + 16);
  
  // Save
  doc.save(`conejos-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportBreedingsToPDF(breedings: Breeding[]) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Reporte de Cruces', 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);
  
  // Table data
  const tableData = breedings.map(breeding => {
    const breedingDate = new Date(breeding.breeding_date).toLocaleDateString('es-ES');
    const expectedDate = breeding.expected_birth_date 
      ? new Date(breeding.expected_birth_date).toLocaleDateString('es-ES')
      : '-';
    
    let status = 'Completado';
    if (breeding.expected_birth_date) {
      const daysUntilBirth = Math.ceil((new Date(breeding.expected_birth_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilBirth > 0) {
        status = `${daysUntilBirth} días restantes`;
      } else if (daysUntilBirth === 0) {
        status = 'Hoy';
      }
    }
    
    return [
      breeding.male_name || `ID ${breeding.male_id}`,
      breeding.female_name || `ID ${breeding.female_id}`,
      breedingDate,
      expectedDate,
      status
    ];
  });
  
  // Generate table
  autoTable(doc, {
    head: [['Macho', 'Hembra', 'Fecha de Cruce', 'Parto Esperado', 'Estado']],
    body: tableData,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [236, 72, 153],
      textColor: 255
    }
  });
  
  // Summary
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(10);
  doc.text(`Total de cruces: ${breedings.length}`, 14, finalY + 10);
  
  const upcoming = breedings.filter(b => {
    if (!b.expected_birth_date) return false;
    const days = Math.ceil((new Date(b.expected_birth_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0;
  }).length;
  doc.text(`Partos pendientes: ${upcoming}`, 14, finalY + 16);
  
  // Save
  doc.save(`cruces-${new Date().toISOString().split('T')[0]}.pdf`);
}

interface Expense {
  id: number;
  expense_date: string;
  expense_type: string;
  description: string;
  amount: number;
  quantity?: number;
  notes?: string;
}

export async function exportExpensesPDF(
  expenses: Expense[], 
  filterType: string = 'all',
  filterPeriod: string = 'all'
) {
  const doc = new jsPDF();
  const userInfo = await getUserInfo();
  
  // Modern header with gradient effect
  doc.setFillColor(249, 115, 22); // Orange-600
  doc.rect(0, 0, 210, 45, 'F');
  
  // Logo/Icon area
  doc.setFillColor(255, 255, 255);
  doc.circle(20, 20, 8, 'F');
  doc.setFillColor(249, 115, 22);
  doc.circle(20, 20, 6, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE GASTOS', 35, 18);
  
  // Ranch/Owner info in header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let headerY = 28;
  if (userInfo.ranch_name) {
    doc.text(`${userInfo.ranch_name}`, 35, headerY);
    headerY += 5;
  } else if (userInfo.name) {
    doc.text(`Propietario: ${userInfo.name}`, 35, headerY);
    headerY += 5;
  }
  if (userInfo.location) {
    doc.text(`${userInfo.location}`, 35, headerY);
  }
  
  // Date in header
  doc.setFontSize(9);
  doc.text(`${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, 35, 39);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Filter information
  let y = 58;
  doc.setFillColor(249, 250, 251);
  doc.rect(14, y - 8, 182, 16, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  
  let filterText = 'Tipo: ';
  if (filterType === 'all') filterText += 'Todos';
  else if (filterType === 'Alimento') filterText += 'Alimento';
  else if (filterType === 'Medicinas') filterText += 'Medicinas';
  
  filterText += ' | Período: ';
  if (filterPeriod === 'all') filterText += 'Todo';
  else if (filterPeriod === 'week') filterText += 'Esta semana';
  else if (filterPeriod === 'month') filterText += 'Este mes';
  else if (filterPeriod === 'year') filterText += 'Este año';
  
  doc.text(filterText, 18, y);
  
  // Reset
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  // Table data
  const tableData = expenses.map(expense => [
    new Date(expense.expense_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    expense.expense_type,
    expense.description,
    expense.quantity ? expense.quantity.toString() : '-',
    `$${expense.amount.toFixed(2)}`,
  ]);
  
  // Generate table
  autoTable(doc, {
    head: [['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Monto']],
    body: tableData,
    startY: y,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [229, 231, 235],
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 28 },
      2: { cellWidth: 70 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    }
  });
  
  // Summary section
  const finalY = (doc as any).lastAutoTable.finalY || y;
  y = finalY + 12;
  
  doc.setFillColor(249, 115, 22);
  doc.rect(14, y - 3, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN', 18, y + 2);
  
  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const alimentoTotal = expenses
    .filter(e => e.expense_type === 'Alimento')
    .reduce((sum, e) => sum + e.amount, 0);
  const medicinasTotal = expenses
    .filter(e => e.expense_type === 'Medicinas')
    .reduce((sum, e) => sum + e.amount, 0);
  
  y += 12;
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const summaryData = [
    ['Total de gastos registrados', expenses.length.toString()],
    ['Total en Alimento', `$${alimentoTotal.toFixed(2)}`],
    ['Total en Medicinas', `$${medicinasTotal.toFixed(2)}`],
    ['TOTAL GENERAL', `$${totalExpenses.toFixed(2)}`]
  ];
  
  autoTable(doc, {
    body: summaryData,
    startY: y,
    theme: 'plain',
    styles: {
      fontSize: 11,
      cellPadding: 4
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        cellWidth: 100,
        textColor: [55, 65, 81]
      },
      1: { 
        cellWidth: 'auto',
        halign: 'right',
        textColor: [31, 41, 55],
        fontStyle: 'bold'
      }
    },
    didParseCell: (data) => {
      // Highlight total row
      if (data.row.index === summaryData.length - 1) {
        data.cell.styles.fillColor = [254, 243, 199]; // Orange-100
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = [249, 115, 22]; // Orange-600
      }
    }
  });
  
  // Professional footer
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 287, 210, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Cunicontrol - Sistema Profesional de Gestión Cunícola', 105, 292, { align: 'center' });
  
  // Generate filename
  let filename = 'gastos';
  if (filterType !== 'all') filename += `-${filterType.toLowerCase()}`;
  if (filterPeriod !== 'all') filename += `-${filterPeriod}`;
  filename += `-${new Date().toISOString().split('T')[0]}.pdf`;
  
  doc.save(filename);
}
