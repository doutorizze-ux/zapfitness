import { jsPDF } from 'jspdf';
import type { DietTemplate, LibraryTemplate, WorkoutTemplate } from '../data/templateLibrary';

const COLORS = {
    navy: [15, 23, 42] as [number, number, number],
    slate: [71, 85, 105] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    line: [226, 232, 240] as [number, number, number],
    soft: [248, 250, 252] as [number, number, number],
    orange: [249, 115, 22] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
};

type PdfOptions = {
    memberName?: string;
    professionalName?: string;
};

function safeFileName(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}

function drawHeader(doc: jsPDF, template: LibraryTemplate, options: PdfOptions) {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, pageWidth, 39, 'F');
    doc.setFillColor(...COLORS.orange);
    doc.roundedRect(16, 11, 17, 17, 4, 4, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Z', 21.5, 23.5);
    doc.setFontSize(9);
    doc.text('ZAP FITNESS', 38, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text('PROTOCOLO PROFISSIONAL', 38, 23);

    doc.setTextColor(...COLORS.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.text(template.title, 16, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.slate);
    doc.text(template.subtitle, 16, 63);

    const metadata = [
        ['OBJETIVO', template.goal],
        ['NÍVEL', template.level],
        ['ESTRUTURA', template.frequency],
    ];
    const cardWidth = (pageWidth - 32 - 8) / 3;
    metadata.forEach(([label, value], index) => {
        const x = 16 + index * (cardWidth + 4);
        doc.setFillColor(...COLORS.soft);
        doc.roundedRect(x, 72, cardWidth, 19, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(label, x + 5, 80);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.navy);
        const lines = doc.splitTextToSize(value, cardWidth - 10);
        doc.text(lines.slice(0, 2), x + 5, 86);
    });

    if (options.memberName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.slate);
        doc.text(`Aluno: ${options.memberName}`, 16, 101);
    }
    if (options.professionalName) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(`Responsável: ${options.professionalName}`, pageWidth - 16, 101, { align: 'right' });
    }
}

function drawFooter(doc: jsPDF, template: LibraryTemplate) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.line);
    doc.line(16, pageHeight - 21, pageWidth - 16, pageHeight - 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    const note = doc.splitTextToSize(template.professionalNote, pageWidth - 32);
    doc.text(note.slice(0, 2), 16, pageHeight - 15);
    doc.setFont('helvetica', 'bold');
    doc.text('ZAP FITNESS', pageWidth - 16, pageHeight - 8, { align: 'right' });
}

function newPageIfNeeded(doc: jsPDF, y: number, height = 30): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + height > pageHeight - 28) {
        doc.addPage();
        return 18;
    }
    return y;
}

function drawWorkout(doc: jsPDF, template: WorkoutTemplate, variationIndex: number): void {
    const variation = template.variations[variationIndex] || template.variations[0];
    let y = 113;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.orange);
    doc.text(variation.name.toUpperCase(), 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(variation.description, 16, y + 6);
    y += 17;

    variation.days.forEach(day => {
        // Keep the whole session together when there is not enough room for
        // its header and exercise rows. This avoids orphaned rows on a new page.
        const dayHeight = 14 + day.exercises.length * 11 + 8;
        y = newPageIfNeeded(doc, y, dayHeight);
        doc.setFillColor(...COLORS.navy);
        doc.roundedRect(16, y, 178, 10, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(day.name, 21, y + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(day.focus, 189, y + 6.5, { align: 'right' });
        y += 14;

        day.exercises.forEach((exercise, index) => {
            y = newPageIfNeeded(doc, y, 13);
            if (index % 2 === 0) {
                doc.setFillColor(252, 252, 253);
                doc.rect(16, y - 4, 178, 11, 'F');
            }
            doc.setTextColor(...COLORS.navy);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(`${index + 1}. ${exercise.name}`, 21, y + 3);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.slate);
            doc.text(`${exercise.sets} séries`, 112, y + 3);
            doc.text(exercise.reps, 139, y + 3);
            doc.text(exercise.rest, 166, y + 3);
            y += 11;
        });
        y += 8;
    });
}

function drawDiet(doc: jsPDF, template: DietTemplate, variationIndex: number): void {
    const variation = template.variations[variationIndex] || template.variations[0];
    let y = 113;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.orange);
    doc.text(variation.name.toUpperCase(), 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(variation.description, 16, y + 6);
    y += 17;

    variation.meals.forEach((meal, index) => {
        const options = meal.options.flatMap(option => doc.splitTextToSize(`• ${option}`, 157));
        const boxHeight = 17 + options.length * 4.5;
        y = newPageIfNeeded(doc, y, boxHeight + 7);
        doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 247 : 250, index % 2 === 0 ? 237 : 252);
        doc.roundedRect(16, y, 178, boxHeight, 3, 3, 'F');
        doc.setTextColor(...COLORS.orange);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(meal.name, 22, y + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.slate);
        doc.text(options, 22, y + 17, { lineHeightFactor: 1.2 });
        y += boxHeight + 7;
    });
}

export function createTemplatePdf(template: LibraryTemplate, variationIndex = 0, options: PdfOptions = {}): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    drawHeader(doc, template, options);

    if (template.type === 'workout') {
        drawWorkout(doc, template, variationIndex);
    } else {
        drawDiet(doc, template, variationIndex);
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        drawFooter(doc, template);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(`${page}/${totalPages}`, 16, doc.internal.pageSize.getHeight() - 8);
    }

    return doc;
}

export function downloadTemplatePdf(template: LibraryTemplate, variationIndex = 0, options: PdfOptions = {}): void {
    const doc = createTemplatePdf(template, variationIndex, options);

    const kind = template.type === 'workout' ? 'treino' : 'plano-alimentar';
    doc.save(`zappfitness-${kind}-${safeFileName(template.title)}.pdf`);
}
