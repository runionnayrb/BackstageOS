import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

interface TemplateData {
  [key: string]: string | number | boolean | TemplateData[] | TemplateData | undefined | null;
}

export class DocumentTemplateProcessor {
  private templatePath: string;
  private doc: Docxtemplater | null = null;

  constructor(templatePath: string) {
    this.templatePath = templatePath;
  }

  async loadTemplate(): Promise<void> {
    const fullPath = path.join(process.cwd(), this.templatePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Template file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, "binary");
    const zip = new PizZip(content);
    
    this.doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });
  }

  async render(data: TemplateData): Promise<Buffer> {
    if (!this.doc) {
      await this.loadTemplate();
    }

    if (!this.doc) {
      throw new Error("Failed to load template");
    }

    try {
      this.doc.render(data);
    } catch (error: any) {
      const e = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        properties: error.properties,
      };
      console.error("Docxtemplater render error:", JSON.stringify(e));
      throw new Error(`Template rendering failed: ${error.message}`);
    }

    const buf = this.doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return buf;
  }

  static async processTemplate(templatePath: string, data: TemplateData): Promise<Buffer> {
    const processor = new DocumentTemplateProcessor(templatePath);
    await processor.loadTemplate();
    return processor.render(data);
  }
}

export function prepareReportData(
  project: any,
  report: any,
  sections?: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
      venue: project?.venue || "",
      openingNight: project?.openingNight ? new Date(project.openingNight).toLocaleDateString() : "",
    },
    report: {
      title: report?.title || "",
      date: report?.date ? new Date(report.date).toLocaleDateString() : new Date().toLocaleDateString(),
      notes: report?.notes || "",
      type: report?.type || "",
    },
    sections: sections?.map((section: any) => ({
      name: section.name || "",
      content: section.content || "",
    })) || [],
  };
}

export function prepareDailyCallData(
  project: any,
  dailyCall: any,
  calls?: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
      venue: project?.venue || "",
    },
    call: {
      date: dailyCall?.date ? new Date(dailyCall.date).toLocaleDateString() : new Date().toLocaleDateString(),
      generalCall: dailyCall?.generalCall || "",
      notes: dailyCall?.notes || "",
    },
    calls: calls?.map((call: any) => ({
      time: call.time || "",
      description: call.description || "",
      location: call.location || "",
      participants: call.participants || "",
    })) || [],
  };
}

export function prepareContactsData(
  project: any,
  contacts: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
    },
    contacts: contacts.map((contact: any) => ({
      name: contact.name || "",
      preferredName: contact.preferredName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      role: contact.role || "",
      department: contact.department || "",
      notes: contact.notes || "",
    })),
  };
}

export function prepareRunningOrderData(
  project: any,
  runningOrder: any,
  scenes?: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
      venue: project?.venue || "",
    },
    runningOrder: {
      version: runningOrder?.version || "1.0",
      title: runningOrder?.title || "",
      date: runningOrder?.date ? new Date(runningOrder.date).toLocaleDateString() : new Date().toLocaleDateString(),
    },
    scenes: scenes?.map((scene: any, index: number) => ({
      number: scene.number || (index + 1).toString(),
      name: scene.name || "",
      duration: scene.duration || "",
      notes: scene.notes || "",
      characters: scene.characters || "",
    })) || [],
  };
}

export function prepareCastListData(
  project: any,
  cast: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
    },
    cast: cast.map((member: any) => ({
      name: member.name || "",
      character: member.character || "",
      email: member.email || "",
      phone: member.phone || "",
      notes: member.notes || "",
    })),
  };
}

export function prepareCrewListData(
  project: any,
  crew: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
    },
    crew: crew.map((member: any) => ({
      name: member.name || "",
      role: member.role || "",
      department: member.department || "",
      email: member.email || "",
      phone: member.phone || "",
      notes: member.notes || "",
    })),
  };
}

export function prepareScheduleData(
  project: any,
  weekOf: Date,
  events: any[]
): TemplateData {
  return {
    show: {
      title: project?.title || "",
    },
    schedule: {
      weekOf: weekOf.toLocaleDateString(),
    },
    events: events.map((event: any) => ({
      title: event.title || "",
      date: event.date ? new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      location: event.location || "",
      notes: event.notes || "",
      participants: event.participants || "",
    })),
  };
}
