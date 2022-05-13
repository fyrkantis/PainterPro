using System.Drawing;
using System.Text.RegularExpressions;

public class DrawRequest
{
	public string phone;
	public Dictionary<int, PixelRequest> pixels = new Dictionary<int, PixelRequest>();
	public DrawRequest(string phone, Dictionary<string, string> fields)
	{
		this.phone = phone;
		foreach (KeyValuePair<string, string> field in fields)
		{
			int index = Convert.ToInt32(char.GetNumericValue(field.Key[0])); // -1 means error.
			if (index != -1)
			{
				if (pixels.ContainsKey(index))
				{
					pixels[index].Add(field);
				}
				else
				{
					pixels.Add(index, new PixelRequest(field));
				}
			}
		}
	}

	public void Draw()
	{
		Bitmap bitmap = (Bitmap)Image.FromFile(PainterPro.Website.currentDirectory + "\\Website\\Assets\\painting.png"); // TODO: Find cross-platform solution.
	}

	public class PixelRequest
	{
		int? x;
		int? y;
		string? color;
		public PixelRequest(KeyValuePair<string, string> field)
		{
			Add(field);
		}

		public void Add(KeyValuePair<string, string> field)
		{
			string key = Regex.Replace(field.Key, @"^\d*", "").ToLower();
			if (key == "color")
			{
				color = field.Value;
			}
			else if (int.TryParse(field.Value, out int value))
			{
				switch (key)
				{
					case "x":
						x = value;
						break;
					case "y":
						y = value;
						break;
				}
			}
		}
	}
}
