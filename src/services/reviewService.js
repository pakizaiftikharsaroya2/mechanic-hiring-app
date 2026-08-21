import { syncCloudRequest } from '../lib/cloudSync';

/** Dedicated persistent reviews store (NEVER cleared when service request history is cleared) */
export function getPersistentReviews(mechanicId) {
  try {
    const all = JSON.parse(localStorage.getItem('mock_mechanic_reviews_store') || '{}');
    if (mechanicId) return all[String(mechanicId)] || all['mechanic_muhammad'] || [];
    return all;
  } catch (e) {
    return [];
  }
}

export function savePersistentReview(mechanicId, reviewItem) {
  try {
    const targetKey = String(mechanicId || 'mechanic_muhammad');
    const all = JSON.parse(localStorage.getItem('mock_mechanic_reviews_store') || '{}');
    const list = all[targetKey] || [];
    // Prevent duplicate review push
    if (!list.some(r => r.comment === reviewItem.comment && r.rating === reviewItem.rating && r.date === reviewItem.date)) {
      list.unshift(reviewItem);
    }
    all[targetKey] = list;
    localStorage.setItem('mock_mechanic_reviews_store', JSON.stringify(all));
  } catch (e) {}
}

/**
 * Submit client rating & review for a completed service request.
 * Computes the mechanic's aggregate rating and permanently stores it.
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

  const effectiveMechId = targetMechanicId || 'mechanic_muhammad';

  const newReviewItem = {
    rating: Number(rating) || 5,
    comment: comment || 'Excellent service and quick repair!',
    client_name: clientName,
    tip: Number(tip) || 0,
    date: new Date().toISOString()
  };

  // Permanently save to isolated reviews store
  savePersistentReview(effectiveMechId, newReviewItem);

  // Compute aggregate rating
  const reviewsForMech = getPersistentReviews(effectiveMechId);
  const totalReviews = reviewsForMech.length;
  const sumRatings = reviewsForMech.reduce((sum, r) => sum + Number(r.rating || 5), 0);
  const avgRating = totalReviews > 0 ? (sumRatings / totalReviews).toFixed(1) : Number(rating).toFixed(1);

  // Save to mechanic profiles cache
  const profiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
  const pIdx = profiles.findIndex(p => String(p.user_id) === String(effectiveMechId));
  const mechData = {
    user_id: effectiveMechId,
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }

  return { avgRating, totalReviews, reviews: reviewsForMech };
}

/** Fetch all reviews and computed rating for a mechanic */
export function getMechanicRatingSummary(mechanicId) {
  const effectiveId = mechanicId || 'mechanic_muhammad';
  try {
    const list = getPersistentReviews(effectiveId);
    if (list && list.length > 0) {
      const sum = list.reduce((acc, curr) => acc + Number(curr.rating || 5), 0);
      const avg = (sum / list.length).toFixed(1);
      return {
        rating: avg,
        review_count: list.length,
        reviews: list
      };
    }
  } catch (e) {}

  return { rating: 'New', review_count: 0, reviews: [] };
}
