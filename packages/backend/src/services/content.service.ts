import type { Content } from '@prisma/client';
import type { CreateContentInput } from '@screen-commander/shared';
import { prisma } from '../prisma';

export async function getAllContent(): Promise<Content[]> {
  return prisma.content.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getContentById(id: string): Promise<Content | null> {
  return prisma.content.findUnique({ where: { id } });
}

export async function createContent(input: CreateContentInput): Promise<Content> {
  return prisma.content.create({
    data: {
      type: input.type,
      url: input.url,
      title: input.title ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function deleteContent(id: string): Promise<Content> {
  // Unlink any displays currently showing this content
  await prisma.display.updateMany({
    where: { currentContentId: id },
    data: { currentContentId: null },
  });

  return prisma.content.delete({ where: { id } });
}
