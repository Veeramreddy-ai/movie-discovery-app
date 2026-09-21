import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { addToWishlist, fetchWishlist, removeFromWishlist } from '../api/wishlist.js';
import { useToast } from '../components/ui/Toast.jsx';

const wishlistOptions = queryOptions({
  queryKey: ['wishlist'],
  queryFn: ({ signal }) => fetchWishlist(signal),
  staleTime: 60_000,
});

export function useWishlist() {
  return useQuery(wishlistOptions);
}

export function useIsWishlisted(movieId) {
  const select = useCallback((data) => data.items.some((item) => item.id === movieId), [movieId]);
  const { data } = useQuery({ ...wishlistOptions, select });
  return data === true;
}


export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationKey: ['wishlist-toggle'],
    scope: { id: 'wishlist' },
    mutationFn: ({ movie, add }) => (add ? addToWishlist(movie.id) : removeFromWishlist(movie.id)),

    onMutate: async ({ movie, add }) => {
      await queryClient.cancelQueries({ queryKey: wishlistOptions.queryKey });
      const previous = queryClient.getQueryData(wishlistOptions.queryKey);
      queryClient.setQueryData(wishlistOptions.queryKey, (old) => {
        const others = (old?.items ?? []).filter((item) => item.id !== movie.id);
        const items = add
          ? [
              {
                id: movie.id,
                title: movie.title,
                year: movie.year ?? null,
                rating: movie.rating ?? null,
                poster: movie.poster ?? null,
                addedAt: new Date().toISOString(),
              },
              ...others,
            ]
          : others;
        return { items, total: items.length };
      });
      return { previous };
    },

    onError: (error, { movie, add }, context) => {
      if (context?.previous) queryClient.setQueryData(wishlistOptions.queryKey, context.previous);
      toast.error(
        add
          ? `Couldn't save "${movie.title}" to your wishlist. ${error.message}`
          : `Couldn't remove "${movie.title}" from your wishlist. ${error.message}`,
      );
    },

    onSuccess: (_data, { movie, add }) => {
      // Removing is easy to do by accident (one tap on a heart), so offer an undo.
      if (!add) {
        toast.info(`Removed "${movie.title}" from your wishlist.`, {
          label: 'Undo',
          onClick: () => mutation.mutate({ movie, add: true }),
        });
      }
    },

    onSettled: () => {
      // Only re-sync once the last queued toggle has finished, otherwise we'd overwrite newer optimistic state.
      if (queryClient.isMutating({ mutationKey: ['wishlist-toggle'] }) <= 1) {
        queryClient.invalidateQueries({ queryKey: wishlistOptions.queryKey });
      }
    },
  });

  return mutation;
}
