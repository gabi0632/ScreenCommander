import type { Favorite } from '@prisma/client';
import type { CreateFavoriteInput, UpdateFavoriteInput } from '@screen-commander/shared';
import { prisma } from '../prisma';

export async function getAllFavorites(): Promise<Favorite[]> {
  return prisma.favorite.findMany({
    orderBy: { order: 'asc' },
  });
}

export async function getFavoriteById(id: string): Promise<Favorite | null> {
  return prisma.favorite.findUnique({ where: { id } });
}

export async function createFavorite(input: CreateFavoriteInput): Promise<Favorite> {
  return prisma.favorite.create({ data: input });
}

export async function updateFavorite(
  id: string,
  input: UpdateFavoriteInput,
): Promise<Favorite> {
  return prisma.favorite.update({
    where: { id },
    data: input,
  });
}

export async function deleteFavorite(id: string): Promise<Favorite> {
  return prisma.favorite.delete({ where: { id } });
}
