// src/services/provider.service.js
const userRepo    = require('../repositories/user.repository');
const serviceRepo = require('../repositories/service.repository');
const reviewRepo  = require('../repositories/review.repository');
const { withCache, cacheDel } = require('../utils/cache.utils');
const { ApiError, buildPaginationMeta } = require('../utils/response.utils');

const TTL = parseInt(process.env.CACHE_TTL_PROVIDERS, 10) || 300;

// Normalise a User document into the shape the frontend expects
function normaliseProvider(user, services = []) {
  const obj = user.toJSON ? user.toJSON() : user;

  // Primary service pricing (first active service)
  const primaryService = services.find(s => s.isActive) || services[0];

  return {
    ...obj,
    // Frontend uses `skills` — DB stores `skillsOffered`
    skills: obj.skillsOffered || [],
    // Frontend uses `hourlyRate` — DB stores it per-service
    hourlyRate: primaryService?.pricing?.amount || 0,
    // Flatten rating for simple usage
    rating:      obj.rating?.average ?? 0,
    reviewCount: obj.rating?.count   ?? 0,
    // Flatten location to string for card display
    locationStr: [obj.location?.city, obj.location?.state, obj.location?.country]
      .filter(Boolean).join(', '),
    services,
  };
}

class ProviderService {
  async listProviders({ page = 1, limit = 20, skill, city, sort = 'rating', q } = {}) {
    const filters = {};
    if (skill || q) {
      const term = skill || q;
      filters.$or = [
        { skillsOffered: { $in: [new RegExp(term, 'i')] } },
        { name:          { $regex: term, $options: 'i' } },
      ];
    }
    if (city) filters['location.city'] = { $regex: city, $options: 'i' };

    const sortMap = {
      rating:     { 'rating.average': -1 },
      newest:     { createdAt: -1 },
      name:       { name: 1 },
      price_asc:  { 'rating.average': 1 }, // fallback; real price sort needs join
      price_desc: { 'rating.average': -1 },
      reviews:    { 'rating.count': -1 },
    };

    const cacheKey = `providers:list:${page}:${limit}:${skill}:${city}:${sort}:${q}`;

    return withCache(cacheKey, TTL, async () => {
      const { data, total } = await userRepo.findProviders({
        filters,
        page:  Number(page),
        limit: Number(limit),
        sort:  sortMap[sort] || sortMap.rating,
      });

      // Batch-load primary services for each provider
      const ids       = data.map(u => u._id);
      const allSvcs   = await serviceRepo.findByProviderIds(ids);

      const providers = data.map(user => {
        const svcs = allSvcs.filter(s => s.providerId?.toString() === user._id.toString());
        return normaliseProvider(user, svcs);
      });

      return { providers, meta: buildPaginationMeta(total, page, limit) };
    });
  }

  async getProvider(id) {
    const cacheKey = `providers:${id}`;

    return withCache(cacheKey, TTL, async () => {
      const provider = await userRepo.findById(id);
      if (!provider || provider.role !== 'provider') {
        throw ApiError.notFound('Provider not found');
      }

      const [services, reviewData] = await Promise.all([
        serviceRepo.findByProvider(id),
        reviewRepo.getAggregatedStats(id),
      ]);

      return {
        provider: normaliseProvider(provider, services),
        ratingStats: reviewData[0] || null,
      };
    });
  }

  async updateProfile(userId, updates) {
    const allowed = ['name', 'bio', 'avatar', 'location', 'skillsOffered', 'availability'];
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    );

    const user = await userRepo.update(userId, filtered);
    await cacheDel(`providers:${userId}`);
    return user;
  }

  async searchProviders({ lat, lng, radius = 50, skill } = {}) {
    if (!lat || !lng) throw ApiError.badRequest('lat and lng are required');
    const extraFilters = {};
    if (skill) extraFilters.skillsOffered = { $in: [skill] };

    const users = await userRepo.findProvidersNear(
      [parseFloat(lng), parseFloat(lat)],
      parseFloat(radius),
      extraFilters
    );

    return users.map(u => normaliseProvider(u, []));
  }
}

module.exports = new ProviderService();
