using MiniBooking.Domain.Bookings;
namespace MiniBooking.Tests;
public sealed class NightlyRateCalculatorTests
{
    private readonly NightlyRateCalculator _calculator = new();
    private static readonly DateOnly Aug1 = new(2026, 8, 1);
    private static readonly DateOnly Aug15 = new(2026, 8, 15);
    [Fact] public void SingleRate_SumsEachOccupiedNight() => Assert.Equal(6000m, Calculate(10, 12, new RatePeriod(Aug1, 3000m)));
    [Fact] public void RateChangeDuringStay_AppliesRatePerNight() => Assert.Equal(13000m, Calculate(13, 17, new(Aug1, 3000m), new(Aug15, 3500m)));
    [Fact] public void RateChangeOnCheckIn_AppliesNewRate() => Assert.Equal(7000m, Calculate(15, 17, new(Aug1, 3000m), new(Aug15, 3500m)));
    [Fact] public void RateChangeOnCheckout_DoesNotApplyNewRate() => Assert.Equal(6000m, Calculate(13, 15, new(Aug1, 3000m), new(Aug15, 3500m)));
    [Fact] public void MultipleRateChanges_AppliesAllPeriods() => Assert.Equal(12500m, Calculate(12, 17, new(Aug1, 2000m), new(new(2026, 8, 13), 2500m), new(new(2026, 8, 16), 3000m)));
    [Theory]
    [InlineData("2026-09-01", "2026-09-05", "2026-09-04", 3500, 4000, 14500)]
    [InlineData("2026-01-30", "2026-02-03", "2026-02-01", 2000, 2500, 9000)]
    [InlineData("2026-12-30", "2027-01-03", "2027-01-01", 3000, 4500, 15000)]
    public void RateChangeDuringStay_UsesEffectiveRateForEveryNight(
        string checkInValue,
        string checkOutValue,
        string rateChangeValue,
        int initialRate,
        int changedRate,
        int expectedTotal)
    {
        var checkIn = DateOnly.Parse(checkInValue);
        var checkOut = DateOnly.Parse(checkOutValue);
        var total = _calculator.Calculate(
            checkIn,
            checkOut,
            [
                new RatePeriod(checkIn.AddDays(-30), initialRate),
                new RatePeriod(DateOnly.Parse(rateChangeValue), changedRate),
            ]);

        Assert.Equal(expectedTotal, total);
    }
    [Fact] public void MissingRate_ThrowsMeaningfulException()
    {
        var exception = Assert.Throws<MissingRateException>(() => Calculate(13, 17, new RatePeriod(Aug15, 3500m)));
        Assert.Equal(new DateOnly(2026, 8, 13), exception.Night);
    }
    [Fact] public void InvalidRange_IsRejected() => Assert.Throws<ArgumentException>(() => _calculator.Calculate(Aug15, Aug15, []));
    private decimal Calculate(int checkInDay, int checkOutDay, params RatePeriod[] rates) => _calculator.Calculate(new(2026, 8, checkInDay), new(2026, 8, checkOutDay), rates);
}
