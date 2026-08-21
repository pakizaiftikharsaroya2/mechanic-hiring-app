import { syncCloudRequest, fetchAllCloudRequests } from '../lib/cloudSync';

/**
 * Submit client rating & review for a completed service request.
 * Computes the mechanic's aggregate rating and syncs across all devices.
 */
export async function submitRequestReview({ requestId, mechanicId, rating, comment, tip = 0, clientName = 'Verified Client' }) {
  const localRequests = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  const reqIdx = localRequests.findIndex(r => String(r.id) === String(requestId));
  
  let targetMechanicId = mechanicId;
  if (reqIdx >= 0) {
    const current = localRequests[reqIdx];
    targetMechanicId = targetMechanicId || current.mechanic_id;
    const updated = {
      ...current,
      client_rating: Number(rating) || 5,
      client_review: comment || 'Excellent service!',
      tip_amount: Number(tip) || 0,
      reviewed_at: new Date().toISOString()
    };
    localRequests[reqIdx] = updated;
    localStorage.setItem('mock_service_requests', JSON.stringify(localRequests));
    await syncCloudRequest(updated);
  }

  // Calculate mechanic aggregate rating
  if (targetMechanicId) {
    const allRequests = await fetchAllCloudRequests();
    const reviewsForMech = (allRequests || [])
      .filter(r => String(r.mechanic_id) === String(targetMechanicId) && r.client_rating)
      .map(r => ({
        rating: Number(r.client_rating),
        comment: r.client_review,
        client_name: r.client_name || 'Verified Client',
        date: r.reviewed_at || r.updated_at || new Date().toISOString()
      }));

    if (reqIdx >= 0 && !reviewsForMech.some(rv => rv.comment === comment && rv.rating === rating)) {
      reviewsForMech.push({
        rating: Number(rating) || 5,
        comment: comment || 'Excellent service!',
        client_name: clientName,
        date: new Date().toISOString()
      });
    }

    const totalReviews = reviewsForMech.length;
    const sumRatings = reviewsForMech.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalReviews > 0 ? (sumRatings / totalReviews).toFixed(1) : Number(rating).toFixed(1);

    // Save in mechanic profiles local cache
    const profiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
    const pIdx = profiles.findIndex(p => String(p.user_id) === String(targetMechanicId));
    const mechData = {
      user_id: targetMechanicId,
      rating: avgRating,
      review_count: totalReviews,
      reviews: reviewsForMech
    };

    if (pIdx >= 0) {
      profiles[pIdx] = { ...profiles[pIdx], ...mechData };
    } else {
      profiles.push(mechData);
    }
    localStorage.setItem('mock_mechanic_profiles', JSON.stringify(profiles));

    // Broadcast updated profile through storage and server
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }

    return { avgRating, totalReviews, reviews: reviewsForMech };
  }

  return { avgRating: Number(rating).toFixed(1), totalReviews: 1, reviews: [] };
}

/** Fetch all reviews and computed rating for a mechanic */
export function getMechanicRatingSummary(mechanicId) {
  if (!mechanicId) return { rating: '5.0', review_count: 1, reviews: [] };
  try {
    const profiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
    const p = profiles.find(pr => String(pr.user_id) === String(mechanicId));
    if (p && p.rating) {
      return {
        rating: String(p.rating),
        review_count: p.review_count || (p.reviews?.length || 1),
        reviews: p.reviews || []
      };
    }
  } catch (e) {}

  return { rating: '5.0', review_count: 1, reviews: [] };
}
