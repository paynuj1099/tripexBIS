namespace MiniBooking.Domain.Bookings;

public sealed record RatePeriod(DateOnly EffectiveFrom, decimal NightlyRate);
public sealed class MissingRateException(DateOnly night) : InvalidOperationException($"No room rate is configured for {night:yyyy-MM-dd}.")
{
    public DateOnly Night { get; } = night;
}

public sealed class NightlyRateCalculator
{
    public decimal Calculate(DateOnly checkIn, DateOnly checkOut, IReadOnlyCollection<RatePeriod> rates)
    {
        if (checkIn >= checkOut) throw new ArgumentException("Check-in must be before check-out.");
        var orderedRates = rates.OrderBy(rate => rate.EffectiveFrom).ToArray();
        decimal total = 0;
        for (var night = checkIn; night < checkOut; night = night.AddDays(1))
        {
            var rate = orderedRates.LastOrDefault(candidate => candidate.EffectiveFrom <= night)
                ?? throw new MissingRateException(night);
            total += rate.NightlyRate;
        }
        return total;
    }
}
