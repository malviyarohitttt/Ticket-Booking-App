/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboard() {
    try {
      const [
        totalEvents,
        completedEvents,
        activeEvents,
        suspendedEvents,

        totalBookings,
        confirmedBookings,
        pendingBookings,

        totalUsers,
        totalManagers,

        totalRevenue,

        events,
      ] = await Promise.all([
        this.prisma.event.count(),

        this.prisma.event.count({
          where: {
            status: 'Completed',
          },
        }),

        this.prisma.event.count({
          where: {
            status: 'Active',
          },
        }),

        this.prisma.event.count({
          where: {
            status: 'Suspended',
          },
        }),

        this.prisma.booking.count(),

        this.prisma.booking.aggregate({
          where: {
            status: 'Confirmed',
          },
          _sum: {
            quantity: true,
          },
        }),

        this.prisma.booking.aggregate({
          where: {
            status: 'Pending',
          },
          _sum: {
            quantity: true,
          },
        }),

        this.prisma.user.count(),

        this.prisma.user.count({
          where: {
            role: 'Manager',
          },
        }),

        this.prisma.booking.aggregate({
          where: {
            status: 'Confirmed',
          },
          _sum: {
            total: true,
          },
        }),

        this.prisma.event.findMany({
          include: {
            manager: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
            bookings: {
              where: {
                status: 'Confirmed',
              },
              include: {
                splits: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      const eventWiseReport = events.map((event) => {
        const totalSales = event.bookings.reduce(
          (sum: number, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = event.bookings.flatMap((booking) => booking.splits);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum: number, split) => sum + Number(split.amount), 0);

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum: number, split) => sum + Number(split.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          manager: {
            id: event.manager.id,
            name: `${event.manager.firstname} ${event.manager.lastname}`,
            email: event.manager.email,
          },
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalSales,
          adminEarnings,
          managerEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      const totalAdminRevenue = eventWiseReport.reduce(
        (sum, event) => sum + event.adminEarnings,
        0,
      );

      const totalManagerRevenue = eventWiseReport.reduce(
        (sum, event) => sum + event.managerEarnings,
        0,
      );

      const totalEstimatedLoss = eventWiseReport.reduce(
        (sum, event) => sum + event.estimatedLoss,
        0,
      );

      return {
        status: 'success',
        dashboard: {
          overview: {
            totalEvents,
            activeEvents,
            completedEvents,
            suspendedEvents,
            totalBookings,
            confirmedBookings: confirmedBookings._sum.quantity ?? 0,
            pendingBookings: pendingBookings._sum.quantity ?? 0,
            totalUsers,
            totalManagers,
            totalRevenue: totalRevenue._sum.total || 0,
            totalAdminRevenue,
            totalManagerRevenue,
            totalEstimatedLoss,
          },
          recentEvents: eventWiseReport.slice(0, 1),
          eventWiseReport: eventWiseReport.slice(0, 1),
        },
      };
    } catch (error) {
      console.log(error);

      throw new Error('Failed to generate admin dashboard');
    }
  }

  async getManagerDashboard(managerId: number) {
    try {
      const eventManagerId = { managerId };
      const confirmedBooking: Prisma.BookingWhereInput = {
        event: {
          managerId,
        },
        status: 'Confirmed',
      };

      const pendingBooking: Prisma.BookingWhereInput = {
        event: {
          managerId,
        },
        status: 'Pending',
      };

      const [
        totalEvents,
        activeEvents,
        suspendedEvents,
        completedEvents,
        totalConfirmedBookings,
        totalPendingBookings,
        sales,
        managerRevenue,
        adminRevenue,
        seatStats,
        events,
      ] = await Promise.all([
        this.prisma.event.count({
          where: eventManagerId,
        }),

        this.prisma.event.count({
          where: {
            ...eventManagerId,
            status: 'Active',
          },
        }),

        this.prisma.event.count({
          where: {
            ...eventManagerId,
            status: 'Suspended',
          },
        }),

        this.prisma.event.count({
          where: {
            ...eventManagerId,
            status: 'Completed',
          },
        }),

        this.prisma.booking.aggregate({
          where: confirmedBooking,
          _sum: {
            quantity: true,
          },
        }),

        this.prisma.booking.count({
          where: pendingBooking,
        }),

        this.prisma.booking.aggregate({
          where: confirmedBooking,
          _sum: {
            total: true,
          },
          _avg: {
            total: true,
          },
        }),

        this.prisma.revenueSplit.aggregate({
          where: {
            splitType: 'Manager',
            booking: confirmedBooking,
          },

          _sum: {
            amount: true,
          },
        }),

        this.prisma.revenueSplit.aggregate({
          where: {
            splitType: 'Admin',
            booking: confirmedBooking,
          },
          _sum: {
            amount: true,
          },
        }),

        this.prisma.event.aggregate({
          where: eventManagerId,

          _sum: {
            totalSeats: true,
            bookedSeats: true,
          },
        }),

        this.prisma.event.findMany({
          where: {
            managerId,
          },
          include: {
            bookings: {
              where: {
                status: 'Confirmed',
              },
              include: {
                splits: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      const totalSeats = seatStats._sum.totalSeats ?? 0;

      const bookedSeats = seatStats._sum.bookedSeats ?? 0;

      const eventWiseReport = events.map((event) => {
        const totalSales = event.bookings.reduce(
          (sum: number, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = event.bookings.flatMap((booking) => booking.splits);

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum: number, split) => sum + Number(split.amount), 0);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum: number, split) => sum + Number(split.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings: totalConfirmedBookings._sum.quantity ?? 0,
          totalSales,
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      const totalEstimatedLoss = eventWiseReport.reduce(
        (sum, event) => sum + event.estimatedLoss,
        0,
      );

      const recentEvents = eventWiseReport.slice(0, 5);

      return {
        status: 'success',

        dashboard: {
          totalEvents,
          activeEvents,
          suspendedEvents,
          completedEvents,
          bookings: {
            totalConfirmedBookings,
            totalPendingBookings,
          },
          totalSales: sales._sum.total ?? 0,
          averageSale: sales._avg.total ?? 0,
          managerEarnings: managerRevenue._sum.amount ?? 0,
          adminEarnings: adminRevenue._sum.amount ?? 0,
          totalSeats,
          bookedSeats,
          remainingSeats: totalSeats - bookedSeats,
          totalEstimatedLoss,
          recentEvents,
          eventWiseReport,
        },
      };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate manager dashboard');
    }
  }

  async getManagerEventWiseReport(managerId: number) {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          managerId,
        },
        include: {
          bookings: {
            include: {
              splits: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const report = events.map((event) => {
        const confirmedBookings = event.bookings.filter(
          (booking) => booking.status === 'Confirmed',
        );

        const pendingBookings = event.bookings.filter(
          (booking) => booking.status === 'Pending',
        );

        const totalSales = confirmedBookings.reduce(
          (sum, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = confirmedBookings.flatMap(
          (booking) => booking.splits,
        );

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings: confirmedBookings.length,
          totalPendingBookings: pendingBookings.length,
          totalSales,
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      return {
        status: 'success',
        report,
      };
    } catch (error) {
      throw new Error('Failed to generate manager event report');
    }
  }
}
