import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboardData() {
    return await this.prisma.$transaction(async (tx) => {
      const totalUsers = await tx.user.count({
        where: { role: 'User' },
      });

      const totalManagers = await tx.user.count({
        where: { role: 'Manager' },
      });

      const suspendedUsers = await tx.user.count({
        where: { status: 'Suspended' },
      });

      const totalEvents = await tx.event.count();

      const activeEvents = await tx.event.count({
        where: { status: 'Active' },
      });

      const suspendedEvents = await tx.event.count({
        where: { status: 'Suspended' },
      });

      const confirmedBookings = await tx.booking.count({
        where: { status: 'CONFIRMED' },
      });

      const pendingBookings = await tx.booking.count({
        where: { status: 'PENDING' },
      });

      const managerCommissions = await tx.revenueSplit.aggregate({
        where: {
          splitType: 'MANAGER',
        },
        _sum: { amount: true },
      });

      const adminCommissions = await tx.revenueSplit.aggregate({
        where: {
          splitType: 'ADMIN',
        },
        _sum: { amount: true },
      });

      const seats = await tx.event.aggregate({
        _sum: {
          totalSeats: true,
          bookedSeats: true,
        },
      });

      const totalSeatCount = seats._sum.totalSeats || 0;
      const bookedSeatCount = seats._sum.bookedSeats || 0;

      return {
        status: 'success',
        data: {
          totalUsers,
          totalManagers,
          suspendedUsers,

          totalEvents,
          activeEvents,
          suspendedEvents,

          bookings: {
            confirmed: confirmedBookings,
            pending: pendingBookings,
          },

          adminEarnings: adminCommissions._sum.amount || 0,
          managerEarnings: managerCommissions._sum.amount || 0,

          totalSeats: totalSeatCount,
          bookedSeats: bookedSeatCount,
          remainingSeats: totalSeatCount - bookedSeatCount,
        },
      };
    });
  }

  async getManagerDashboardData(managerId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const totalEvents = await tx.event.count({
        where: {
          managerId,
        },
      });

      const activeEvents = await tx.event.count({
        where: {
          managerId,
          status: 'Active',
        },
      });

      const suspendedEvents = await tx.event.count({
        where: {
          managerId,
          status: 'Suspended',
        },
      });

      const totalConfirmedBookings = await tx.booking.count({
        where: {
          event: {
            managerId,
          },
          status: 'CONFIRMED',
        },
      });

      const totalPandingBookings = await tx.booking.count({
        where: {
          event: {
            managerId,
          },
          status: 'PENDING',
        },
      });

      const sales = await tx.booking.aggregate({
        where: {
          event: {
            managerId,
          },
          status: 'CONFIRMED',
        },
        _sum: {
          total: true,
        },
        _avg: {
          total: true,
        },
      });

      const managerRevenue = await tx.revenueSplit.aggregate({
        where: {
          splitType: 'MANAGER',
          booking: {
            event: {
              managerId,
            },
            status: 'CONFIRMED',
          },
        },
        _sum: {
          amount: true,
        },
      });

      const adminRevenue = await tx.revenueSplit.aggregate({
        where: {
          splitType: 'ADMIN',
          booking: {
            event: {
              managerId,
            },
            status: 'CONFIRMED',
          },
        },
        _sum: {
          amount: true,
        },
      });

      const seatStats = await tx.event.aggregate({
        where: {
          managerId,
        },
        _sum: {
          totalSeats: true,
          bookedSeats: true,
        },
      });

      const totalSeats = seatStats._sum.totalSeats || 0;
      const bookedSeats = seatStats._sum.bookedSeats || 0;

      return {
        status: 'success',
        data: {
          totalEvents,
          activeEvents,
          suspendedEvents,

          bookings: {
            totalConfirmedBookings,
            totalPandingBookings,
          },

          totalSales: sales._sum.total || 0,
          managerEarnings: managerRevenue._sum.amount || 0,
          adminEarnings: adminRevenue._sum.amount || 0,

          totalSeats,
          bookedSeats,
          remainingSeats: totalSeats - bookedSeats,
        },
      };
    });
  }

  async getManagerEventWiseReport(managerId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const events = await tx.event.findMany({
        where: {
          managerId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const report = [];

      for (const event of events) {
        const totalConfirmedBookings = await tx.booking.count({
          where: {
            eventId: event.id,
            status: 'CONFIRMED',
          },
        });

        const totalPandingBookings = await tx.booking.count({
          where: {
            eventId: event.id,
            status: 'PENDING',
          },
        });

        const sales = await tx.booking.aggregate({
          where: {
            eventId: event.id,
            status: 'CONFIRMED',
          },
          _sum: {
            total: true,
          },
        });

        const managerRevenue = await tx.revenueSplit.aggregate({
          where: {
            splitType: 'MANAGER',
            booking: {
              eventId: event.id,
              status: 'CONFIRMED',
            },
          },
          _sum: {
            amount: true,
          },
        });

        const adminRevenue = await tx.revenueSplit.aggregate({
          where: {
            splitType: 'ADMIN',
            booking: {
              eventId: event.id,
              status: 'CONFIRMED',
            },
          },
          _sum: {
            amount: true,
          },
        });

        report.push({
          id: event.id,
          title: event.title,
          date: event.date,
          venue: event.venue,
          eventStatus: event.status,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats: event.totalSeats - event.bookedSeats,
          totalConfirmedBookings,
          totalPandingBookings,
          totalSales: sales._sum.total || 0,
          managerEarnings: managerRevenue._sum.amount || 0,
          adminEarnings: adminRevenue._sum.amount || 0,
        });
      }
      return { status: 'success', report };
    });
  }

  async getUserPurchaseHistory(userId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (bookings.length == 0) {
      throw new Error('No purchase history found!');
    }

    return bookings.map((booking) => ({
      bookingId: booking.id,
      eventTitle: booking.event.title,
      performer: booking.event.performer,
      venue: booking.event.venue,
      eventDate: booking.event.date,
      quantity: booking.quantity,
      totalPaid: booking.total,
      bookingStatus: booking.status,
      bookedAt: booking.createdAt,
    }));
  }
}
