using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace PainterPro
{
	public static class Util
	{
		public static string swishDomain = "https://mss.cpc.getswish.net";
		public static string swishPath = "/swish-cpcapi/api/v2/paymentrequests/";
		public static string swishIp = "213.132.115.94:443";

		public static string currentDirectory = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName;
		public static Dictionary<string, string> appsettings = JsonSerializer.Deserialize<Dictionary<string, string>>(File.OpenRead(currentDirectory + "\\appsettings.json"));

		public static string GrammaticalListing(IEnumerable<object> collection)
		{
			int count = collection.Count();
			if (count >= 2)
			{
				return string.Join(", ", collection.Take(count - 1)) + " and " + collection.Last();
			}
			else if (count == 1)
			{
				string? firstString = collection.First().ToString();
				if (firstString == null)
				{
					return "";
				}
				return firstString;
			}
			return "";
		}
	}

	public static class MyConsole
	{
		public static ConsoleColor color
		{
			set
			{
#if DEBUG
				Console.ForegroundColor = value;
#endif
			}
		}

		public static void SetStatusColor(bool condition)
		{
			if (condition)
			{
				color = ConsoleColor.Green;
			}
			else
			{
				color = ConsoleColor.Red;
			}
		}

		public static void Write(object value)
		{
			Debug.Write(value);
#if DEBUG
			Console.Write(value);
#endif
		}

		public static void WriteLine(object value)
		{
			Write("\r\n");
			Write(value);
		}

		public static void WriteTimestamp()
		{
			color = ConsoleColor.White;
			WriteLine(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"));
			color = ConsoleColor.Blue;
		}

		public static void WriteData(string name, string data)
		{
			color = ConsoleColor.White;
			WriteLine(name + ": ");
			color = ConsoleColor.Magenta;
			Write(data);
		}

		public static void WriteMany(params object?[] elements)
		{
			foreach (object? element in elements)
			{
				if (element != null)
				{
					Write(" " + element.ToString());
				}
			}
		}

		public static void WriteHttpStatus(HttpListenerContext context)
		{
			SetStatusColor(context.Response.StatusCode >= 100 && context.Response.StatusCode < 400);
			WriteMany(context.Response.StatusCode, context.Response.StatusDescription);
			if (context.Response.RedirectLocation != null)
			{
				color = ConsoleColor.Magenta;
				WriteMany("->", context.Response.RedirectLocation);
			}
		}
	}
}